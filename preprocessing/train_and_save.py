import os
import json
import pickle
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# Paths
DATASET_PATH = r"c:\Users\hp\CODEBASE\Projects\ClimatePrediction-Crop\datasets\feature_engineered_dataset.csv"
MODEL_DIR = r"c:\Users\hp\CODEBASE\Projects\ClimatePrediction-Crop\trained_models"
MODEL_PATH = os.path.join(MODEL_DIR, "best_model.pkl")
METADATA_PATH = os.path.join(MODEL_DIR, "model_metadata.json")

def main():
    # Load dataset
    if not os.path.exists(DATASET_PATH):
        print(f"Error: Dataset not found at {DATASET_PATH}")
        return

    df = pd.read_csv(DATASET_PATH)
    print(f"Loaded dataset with shape: {df.shape}")

    # Extract global means from final_large_scale_dataset.csv (or feature_engineered_dataset.csv if same)
    # The feature engineering notebook uses the mean of T2M, RH2M, PRECTOTCORR to compute anomalies.
    # Let's read final_large_scale_dataset.csv if it exists to get the baseline mean, or compute from df.
    large_scale_path = r"c:\Users\hp\CODEBASE\Projects\ClimatePrediction-Crop\datasets\final_large_scale_dataset.csv"
    if os.path.exists(large_scale_path):
        large_df = pd.read_csv(large_scale_path)
        global_t2m_mean = float(large_df['T2M'].mean())
        global_prectotcorr_mean = float(large_df['PRECTOTCORR'].mean())
        global_rh2m_mean = float(large_df['RH2M'].mean())
        print("Computed global means from final_large_scale_dataset.csv:")
    else:
        # Fallback to feature_engineered_dataset.csv means
        # In feature_engineering.ipynb:
        # Temp_Anomaly = T2M - T2M.mean() (where df is final_large_scale_dataset)
        # So we can estimate the global mean back-calculating from the anomaly: T2M - Temp_Anomaly
        sample = df.iloc[0]
        global_t2m_mean = float(sample['T2M'] - sample['Temp_Anomaly'])
        global_prectotcorr_mean = float(sample['PRECTOTCORR'] - sample['Rain_Anomaly'])
        global_rh2m_mean = float(sample['RH2M'] - sample['Humidity_Anomaly'])
        print("Estimated global means from feature_engineered_dataset.csv anomalies:")

    print(f"  T2M Mean: {global_t2m_mean}")
    print(f"  PRECTOTCORR Mean: {global_prectotcorr_mean}")
    print(f"  RH2M Mean: {global_rh2m_mean}")

    # Features and target
    features = [
        'T2M',
        'RH2M',
        'PRECTOTCORR',
        'NDVI',
        'Temp_Anomaly',
        'Rain_Anomaly',
        'Humidity_Anomaly',
        'Climate_Anomaly_Score',
        'Previous_Year_Yield',
        'Rolling_Temp_Avg',
        'Rolling_Rainfall_Avg',
        'District_Encoded'
    ]
    target = 'Yield'

    X = df[features]
    y = df[target]

    # Split train/test
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # Train Random Forest Regressor
    print("Training RandomForestRegressor...")
    model = RandomForestRegressor(n_estimators=300, random_state=42)
    model.fit(X_train, y_train)

    # Evaluate
    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    rmse = np.sqrt(mean_squared_error(y_test, preds))
    r2 = r2_score(y_test, preds)

    print(f"Model Evaluation on Test Set:")
    print(f"  MAE:  {mae:.4f}")
    print(f"  RMSE: {rmse:.4f}")
    print(f"  R2:   {r2:.4f}")

    # Create models directory if it doesn't exist
    os.makedirs(MODEL_DIR, exist_ok=True)

    # Save model
    with open(MODEL_PATH, 'wb') as f:
        pickle.dump(model, f)
    print(f"Saved best model to: {MODEL_PATH}")

    # Create district mapping and latest historical records
    # district mapping name -> encoded int
    district_mapping = {row['District_Name']: int(row['District_Encoded']) for _, row in df[['District_Name', 'District_Encoded']].drop_duplicates().iterrows()}

    # Get latest records for each district (useful for Previous_Year_Yield and Rolling averages calculation)
    # We want to store the recent year weather and yield values for each district
    # For a given district, we need:
    # - Yield in 2024 (which becomes Previous_Year_Yield for 2025)
    # - T2M and PRECTOTCORR in 2024 and 2023 (for rolling averages of 3 years)
    historical_records = {}
    for district in df['District_Name'].unique():
        dist_df = df[df['District_Name'] == district].sort_values('Year')
        
        # Latest year in data
        latest_year = int(dist_df['Year'].max())
        latest_row = dist_df[dist_df['Year'] == latest_year].iloc[0]
        
        # 2nd latest year in data
        prev_year = latest_year - 1
        prev_rows = dist_df[dist_df['Year'] == prev_year]
        prev_t2m = float(prev_rows.iloc[0]['T2M']) if len(prev_rows) > 0 else float(latest_row['T2M'])
        prev_prec = float(prev_rows.iloc[0]['PRECTOTCORR']) if len(prev_rows) > 0 else float(latest_row['PRECTOTCORR'])

        historical_records[district] = {
            "latest_year": latest_year,
            "latest_yield": float(latest_row['Yield']),
            "latest_t2m": float(latest_row['T2M']),
            "latest_prectotcorr": float(latest_row['PRECTOTCORR']),
            "prev_t2m": prev_t2m,
            "prev_prectotcorr": prev_prec
        }

    # Save metadata
    metadata = {
        "features": features,
        "global_means": {
            "T2M": global_t2m_mean,
            "PRECTOTCORR": global_prectotcorr_mean,
            "RH2M": global_rh2m_mean
        },
        "district_mapping": district_mapping,
        "historical_records": historical_records
    }

    with open(METADATA_PATH, 'w') as f:
        json.dump(metadata, f, indent=4)
    print(f"Saved metadata to: {METADATA_PATH}")

if __name__ == "__main__":
    main()
