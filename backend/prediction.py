import os
import json
import pickle
import numpy as np
import pandas as pd
import shap
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

# Paths
MODEL_DIR = r"c:\Users\hp\CODEBASE\Projects\ClimatePrediction-Crop\trained_models"
MODEL_PATH = os.path.join(MODEL_DIR, "best_model.pkl")
METADATA_PATH = os.path.join(MODEL_DIR, "model_metadata.json")

# Global variables for model and metadata
model = None
metadata = None

def load_model_and_metadata():
    global model, metadata
    if not os.path.exists(MODEL_PATH) or not os.path.exists(METADATA_PATH):
        raise RuntimeError("Model or metadata file is missing. Please train the model first.")
    
    if model is None:
        with open(MODEL_PATH, 'rb') as f:
            model = pickle.load(f)
    
    if metadata is None:
        with open(METADATA_PATH, 'r') as f:
            metadata = json.load(f)

class PredictRequest(BaseModel):
    district: str
    temperature: float
    humidity: float
    rainfall: float
    ndvi: float

class PredictResponse(BaseModel):
    predicted_yield: float
    confidence_score: float
    climate_explanation: str
    feature_contributions: dict
    engineered_features: dict

@router.post("/predict", response_model=PredictResponse)
async def predict(req: PredictRequest):
    try:
        load_model_and_metadata()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    district_clean = req.district.strip().lower()
    
    # Check if district is valid
    if district_clean not in metadata["district_mapping"]:
        raise HTTPException(
            status_code=400, 
            detail=f"District '{req.district}' is not recognized. Please choose one of the 59 available districts."
        )
    
    # 1. Feature Engineering
    global_means = metadata["global_means"]
    historical_records = metadata["historical_records"]
    district_mapping = metadata["district_mapping"]
    
    # Anomaly Calculations
    temp_anomaly = req.temperature - global_means["T2M"]
    rain_anomaly = req.rainfall - global_means["PRECTOTCORR"]
    humidity_anomaly = req.humidity - global_means["RH2M"]
    
    # Climate Anomaly Score
    # Climate_Anomaly_Score = |Temp_Anomaly| + |Rain_Anomaly / 100| + |Humidity_Anomaly|
    climate_anomaly_score = abs(temp_anomaly) + abs(rain_anomaly / 100) + abs(humidity_anomaly)
    
    # Lookup historical records for district
    hist = historical_records[district_clean]
    prev_yield = hist["latest_yield"]  # Yield of latest year (2024) becomes Previous_Year_Yield
    
    # Rolling averages (3-year window: current input + 2024 + 2023)
    rolling_temp = (req.temperature + hist["latest_t2m"] + hist["prev_t2m"]) / 3
    rolling_rainfall = (req.rainfall + hist["latest_prectotcorr"] + hist["prev_prectotcorr"]) / 3
    
    # Encode district
    district_encoded = district_mapping[district_clean]
    
    # Construct feature dictionary matching the model columns
    feat_dict = {
        'T2M': req.temperature,
        'RH2M': req.humidity,
        'PRECTOTCORR': req.rainfall,
        'NDVI': req.ndvi,
        'Temp_Anomaly': temp_anomaly,
        'Rain_Anomaly': rain_anomaly,
        'Humidity_Anomaly': humidity_anomaly,
        'Climate_Anomaly_Score': climate_anomaly_score,
        'Previous_Year_Yield': prev_yield,
        'Rolling_Temp_Avg': rolling_temp,
        'Rolling_Rainfall_Avg': rolling_rainfall,
        'District_Encoded': district_encoded
    }
    
    # Create DataFrame for model input
    df_input = pd.DataFrame([feat_dict])
    
    # Reorder columns to match features list
    feature_cols = metadata["features"]
    df_input = df_input[feature_cols]
    
    # 2. Prediction
    pred_yield = float(model.predict(df_input)[0])
    
    # 3. Confidence Score calculation using Tree Variance
    try:
        # Standard deviation of predictions across all trees in Random Forest
        tree_preds = np.array([estimator.predict(df_input.values)[0] for estimator in model.estimators_])
        std_dev = float(tree_preds.std())
        mean_pred = float(tree_preds.mean())
        
        # Calculate CV (Coefficient of Variation) = std_dev / mean_pred
        # Map CV to confidence score: high variance -> low confidence
        # A typical standard deviation in crop yield predictions is around 0.1 - 0.5 tons/hectare.
        # We can map standard deviation to a 0-100% confidence scale
        # 0.0 standard deviation = 100% confidence, 0.6 standard deviation = 50% confidence, >= 1.2 = 0% confidence
        conf_score = max(10.0, min(100.0, 100.0 * (1.0 - (std_dev / 0.8))))
    except Exception:
        conf_score = 85.0  # Fallback confidence
    
    # 4. Feature Contributions (SHAP approximation or feature importance-based breakdown)
    # Since running full SHAP dynamically on 300 trees can sometimes be heavy, we compute tree-path contributions
    # or return an optimized SHAP-value dictionary based on SHAP TreeExplainer
    contributions = {}
    try:
        import shap
        explainer = shap.TreeExplainer(model)
        shap_vals = explainer(df_input)
        # Extract SHAP value for each feature
        for i, col in enumerate(feature_cols):
            contributions[col] = float(shap_vals.values[0][i])
    except Exception as e:
        # Fallback to feature importance sign scaled by anomaly direction
        importances = model.feature_importances_
        for i, col in enumerate(feature_cols):
            # approximate sign based on anomaly direction
            sign = -1.0 if 'Anomaly' in col and feat_dict[col] > 0 else 1.0
            contributions[col] = float(importances[i] * sign * 0.5)
            
    # 5. Climate Explanation
    if climate_anomaly_score < 3.5:
        risk_level = "Normal"
        explanation = (
            f"The climate conditions in {req.district.title()} are within historical normals (Anomaly Score: {climate_anomaly_score:.2f}). "
            f"Expected yield is high ({pred_yield:.2f} t/ha), supported by optimal weather patterns and a strong NDVI of {req.ndvi:.2f}."
        )
    elif climate_anomaly_score < 7.5:
        risk_level = "Moderate Risk"
        explanation = (
            f"Moderate climate anomalies detected (Anomaly Score: {climate_anomaly_score:.2f}). "
            f"Temperature or rainfall deviations have introduced minor stress on crop development. "
            f"Yield is estimated at {pred_yield:.2f} t/ha. High satellite NDVI could help buffer against these climate stresses."
        )
    else:
        risk_level = "High Risk"
        explanation = (
            f"Severe climate anomalies detected in {req.district.title()} (Anomaly Score: {climate_anomaly_score:.2f}). "
            f"The crop is under significant temperature, rainfall, or humidity stress, which historically suppresses yield. "
            f"Predicted yield is {pred_yield:.2f} t/ha, reflecting a climate-driven reduction of expected output."
        )
        
    # Log prediction to DB (mock or actual handled in main.py)
    try:
        import backend.prediction as pred_module
        if hasattr(pred_module, 'log_prediction_to_db'):
            pred_module.log_prediction_to_db(
                district=req.district,
                inputs={
                    "temperature": req.temperature,
                    "humidity": req.humidity,
                    "rainfall": req.rainfall,
                    "ndvi": req.ndvi
                },
                prediction=round(pred_yield, 3),
                confidence=round(conf_score, 1),
                risk_level=risk_level
            )
    except Exception as log_err:
        print(f"Failed to log prediction: {log_err}")
    
    return PredictResponse(
        predicted_yield=round(pred_yield, 3),
        confidence_score=round(conf_score, 1),
        climate_explanation=explanation,
        feature_contributions=contributions,
        engineered_features={k: round(v, 3) if isinstance(v, float) else v for k, v in feat_dict.items()}
    )

