import os
import datetime
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from backend.prediction import router as predict_router
from backend.anomaly import router as anomaly_router, prediction_logs
import pymongo

app = FastAPI(
    title="AgriClimate AI Backend APIs",
    description="Research-Grade Crop Yield Prediction & Climate Anomaly Analysis API.",
    version="1.0.0"
)

# Enable CORS for Next.js app (running locally on port 3000 by default)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict this to ["http://localhost:3000"] in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect to MongoDB Atlas if connection string is provided, otherwise fall back to mock log
db_connected = False
logs_collection = None

MONGODB_URI = os.environ.get("MONGODB_URI")
if MONGODB_URI:
    try:
        client = pymongo.MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        # Check connection
        client.admin.command('ping')
        db = client["agriclimate"]
        logs_collection = db["prediction_logs"]
        db_connected = True
        print("Successfully connected to MongoDB Atlas!")
    except Exception as e:
        print(f"Failed to connect to MongoDB Atlas, falling back to local memory logging: {e}")
else:
    print("MONGODB_URI environment variable not set. Using local in-memory log.")

# Middleware to log API predictions
@app.middleware("http")
async def log_predictions_middleware(request: Request, call_next):
    # Process request
    response = await call_next(request)
    
    # We only log requests to the /predict endpoint that succeed
    if request.url.path == "/predict" and request.method == "POST" and response.status_code == 200:
        try:
            # We want to capture prediction details
            # FastAPI response body is consumed, but we can intercept it or let prediction router log directly.
            # To be safe, we will let prediction router call our global log helper.
            pass
        except Exception:
            pass
            
    return response

# Global log helper
def log_prediction_to_db(district: str, inputs: dict, prediction: float, confidence: float, risk_level: str):
    log_entry = {
        "timestamp": datetime.datetime.now().isoformat(),
        "district": district,
        "inputs": inputs,
        "predicted_yield": prediction,
        "confidence_score": confidence,
        "risk_level": risk_level
    }
    
    # Append to local in-memory logs (limit to last 100 entries)
    prediction_logs.insert(0, log_entry)
    if len(prediction_logs) > 100:
        prediction_logs.pop()
        
    # Write to MongoDB if connected
    if db_connected and logs_collection is not None:
        try:
            logs_collection.insert_one(log_entry)
        except Exception as e:
            print(f"MongoDB write failed: {e}")

# Expose global logger so prediction.py can call it
import backend.prediction as pred_module
pred_module.log_prediction_to_db = log_prediction_to_db

@app.get("/")
async def root():
    return {
        "status": "Healthy",
        "service": "AgriClimate AI API Gateway",
        "mongodb_connected": db_connected,
        "available_endpoints": [
            "GET /",
            "POST /predict",
            "GET /districts",
            "GET /climate-risk/{district}",
            "GET /district-trends/{district}",
            "GET /shap/{district}",
            "POST /admin/retrain",
            "GET /admin/logs"
        ]
    }

# Include routers
app.include_router(predict_router, tags=["Predictions"])
app.include_router(anomaly_router, tags=["Analytics & Admin"])
