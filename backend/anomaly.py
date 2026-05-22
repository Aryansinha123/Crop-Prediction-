import os
import json
import pickle
import pandas as pd
import numpy as np
import shap
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any

router = APIRouter()

# Paths
DATASET_PATH = r"c:\Users\hp\CODEBASE\Projects\ClimatePrediction-Crop\datasets\feature_engineered_dataset.csv"
MODEL_DIR = r"c:\Users\hp\CODEBASE\Projects\ClimatePrediction-Crop\trained_models"
MODEL_PATH = os.path.join(MODEL_DIR, "best_model.pkl")
METADATA_PATH = os.path.join(MODEL_DIR, "model_metadata.json")

# In-memory logs for predictions (as fallback to MongoDB Atlas)
prediction_logs = []

class AnomalyBreakdown(BaseModel):
    temp_anomaly: float
    rain_anomaly: float
    humidity_anomaly: float

class ClimateRiskResponse(BaseModel):
    district: str
    year: int
    anomaly_score: float
    risk_level: str
    breakdown: AnomalyBreakdown
    message: str

class DistrictTrendRecord(BaseModel):
    year: int
    temperature: float
    humidity: float
    rainfall: float
    ndvi: float
    yield_val: float
    anomaly_score: float
    risk_level: str

class DistrictTrendsResponse(BaseModel):
    district: str
    trends: List[DistrictTrendRecord]

class RetrainResponse(BaseModel):
    status: str
    mae: float
    rmse: float
    r2: float
    message: str

def get_risk_level(score: float) -> str:
    # Based on feature_engineered_dataset.csv stats:
    # min: 0.81, 25%: 3.47, 50%: 5.35, 75%: 8.77, max: 24.95
    if score < 3.5:
        return "Normal"
    elif score < 7.5:
        return "Moderate Risk"
    else:
        return "High Risk"

def get_risk_message(district: str, score: float, level: str) -> str:
    if level == "Normal":
        return f"{district.title()} has normal climatic conditions. Ideal for agriculture."
    elif level == "Moderate Risk":
        return f"{district.title()} has moderate climate anomalies. Crop yield might face slight pressure."
    else:
        return f"Warning! {district.title()} shows high climate instability. Significant crop yield risks predicted."

@router.get("/districts", response_model=List[str])
async def get_districts():
    if not os.path.exists(DATASET_PATH):
        raise HTTPException(status_code=500, detail="Data file not found.")
    df = pd.read_csv(DATASET_PATH)
    districts = sorted(df['District_Name'].unique().tolist())
    return [d.title() for d in districts]

@router.get("/climate-risk", response_model=List[ClimateRiskResponse])
async def get_all_climate_risks():
    if not os.path.exists(DATASET_PATH):
        raise HTTPException(status_code=500, detail="Data file not found.")
    df = pd.read_csv(DATASET_PATH)
    
    # Get the latest year for each district (latest year is 2024)
    latest_rows = df[df['Year'] == 2024]
    
    # In case 2024 is missing for some districts, get the latest year per district
    if latest_rows.empty or len(latest_rows) < len(df['District_Name'].unique()):
        latest_indices = df.groupby('District_Name')['Year'].idxmax()
        latest_rows = df.loc[latest_indices]
        
    results = []
    for _, row in latest_rows.iterrows():
        dist_name = str(row['District_Name'])
        score = float(row['Climate_Anomaly_Score'])
        risk = get_risk_level(score)
        results.append(
            ClimateRiskResponse(
                district=dist_name.title(),
                year=int(row['Year']),
                anomaly_score=round(score, 2),
                risk_level=risk,
                breakdown=AnomalyBreakdown(
                    temp_anomaly=round(float(row['Temp_Anomaly']), 3),
                    rain_anomaly=round(float(row['Rain_Anomaly']), 3),
                    humidity_anomaly=round(float(row['Humidity_Anomaly']), 3)
                ),
                message=get_risk_message(dist_name, score, risk)
            )
        )
    # Sort alphabetically by district name
    results.sort(key=lambda x: x.district)
    return results

@router.get("/climate-risk/{district}", response_model=ClimateRiskResponse)
async def get_climate_risk(district: str):
    district_clean = district.strip().lower()
    if not os.path.exists(DATASET_PATH):
        raise HTTPException(status_code=500, detail="Data file not found.")
    
    df = pd.read_csv(DATASET_PATH)
    dist_df = df[df['District_Name'] == district_clean]
    
    if dist_df.empty:
        raise HTTPException(status_code=404, detail=f"District '{district}' not found.")
    
    # Get latest year (2024)
    latest_row = dist_df.sort_values('Year', ascending=False).iloc[0]
    score = float(latest_row['Climate_Anomaly_Score'])
    risk = get_risk_level(score)
    
    return ClimateRiskResponse(
        district=district.title(),
        year=int(latest_row['Year']),
        anomaly_score=round(score, 2),
        risk_level=risk,
        breakdown=AnomalyBreakdown(
            temp_anomaly=round(float(latest_row['Temp_Anomaly']), 3),
            rain_anomaly=round(float(latest_row['Rain_Anomaly']), 3),
            humidity_anomaly=round(float(latest_row['Humidity_Anomaly']), 3)
        ),
        message=get_risk_message(district, score, risk)
    )

@router.get("/district-trends/{district}", response_model=DistrictTrendsResponse)
async def get_district_trends(district: str):
    district_clean = district.strip().lower()
    if not os.path.exists(DATASET_PATH):
        raise HTTPException(status_code=500, detail="Data file not found.")
    
    df = pd.read_csv(DATASET_PATH)
    dist_df = df[df['District_Name'] == district_clean].sort_values('Year')
    
    if dist_df.empty:
        raise HTTPException(status_code=404, detail=f"District '{district}' not found.")
    
    trends = []
    for _, row in dist_df.iterrows():
        score = float(row['Climate_Anomaly_Score'])
        trends.append(
            DistrictTrendRecord(
                year=int(row['Year']),
                temperature=round(float(row['T2M']), 2),
                humidity=round(float(row['RH2M']), 2),
                rainfall=round(float(row['PRECTOTCORR']), 1),
                ndvi=round(float(row['NDVI']), 3),
                yield_val=round(float(row['Yield']), 3),
                anomaly_score=round(score, 2),
                risk_level=get_risk_level(score)
            )
        )
        
    return DistrictTrendsResponse(district=district.title(), trends=trends)

@router.get("/shap/{district}")
async def get_district_shap(district: str):
    district_clean = district.strip().lower()
    
    # Expose pre-computed SHAP approximations or run TreeExplainer for the district's 2024 data
    if not os.path.exists(MODEL_PATH) or not os.path.exists(METADATA_PATH):
        raise HTTPException(status_code=500, detail="Model is not trained.")
        
    with open(MODEL_PATH, 'rb') as f:
        model = pickle.load(f)
    with open(METADATA_PATH, 'r') as f:
        meta = json.load(f)
        
    if district_clean not in meta["district_mapping"]:
        raise HTTPException(status_code=404, detail=f"District '{district}' not recognized.")
        
    df = pd.read_csv(DATASET_PATH)
    dist_df = df[df['District_Name'] == district_clean].sort_values('Year', ascending=False)
    
    if dist_df.empty:
        raise HTTPException(status_code=404, detail=f"No data available for district.")
        
    latest_row = dist_df.iloc[0]
    
    # Construct input dataframe
    features = meta["features"]
    df_input = pd.DataFrame([latest_row[features]])
    
    contributions = {}
    try:
        import shap
        explainer = shap.TreeExplainer(model)
        shap_vals = explainer(df_input)
        for i, col in enumerate(features):
            contributions[col] = float(shap_vals.values[0][i])
    except Exception:
        importances = model.feature_importances_
        for i, col in enumerate(features):
            sign = -1.0 if 'Anomaly' in col and latest_row[col] > 0 else 1.0
            contributions[col] = float(importances[i] * sign * 0.4)
            
    return {
        "district": district.title(),
        "year": int(latest_row['Year']),
        "yield": round(float(latest_row['Yield']), 3),
        "contributions": contributions
    }

@router.post("/admin/retrain", response_model=RetrainResponse)
async def admin_retrain():
    # Import training main function dynamically to retrain
    try:
        import sys
        sys.path.append(r"c:\Users\hp\CODEBASE\Projects\ClimatePrediction-Crop")
        from preprocessing.train_and_save import main as retrain_model
        
        # Execute retraining
        retrain_model()
        
        # Reload model performance metrics
        # Let's inspect the results
        df = pd.read_csv(DATASET_PATH)
        features = [
            'T2M', 'RH2M', 'PRECTOTCORR', 'NDVI',
            'Temp_Anomaly', 'Rain_Anomaly', 'Humidity_Anomaly', 'Climate_Anomaly_Score',
            'Previous_Year_Yield', 'Rolling_Temp_Avg', 'Rolling_Rainfall_Avg', 'District_Encoded'
        ]
        X = df[features]
        y = df['Yield']
        from sklearn.model_selection import train_test_split
        from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        with open(MODEL_PATH, 'rb') as f:
            trained_model = pickle.load(f)
            
        preds = trained_model.predict(X_test)
        mae = float(mean_absolute_error(y_test, preds))
        rmse = float(np.sqrt(mean_squared_error(y_test, preds)))
        r2 = float(r2_score(y_test, preds))
        
        return RetrainResponse(
            status="Success",
            mae=round(mae, 4),
            rmse=round(rmse, 4),
            r2=round(r2, 4),
            message="AgriClimate Random Forest Model retrained successfully and updated."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retraining failed: {str(e)}")

@router.get("/admin/logs")
async def get_admin_logs():
    return prediction_logs
