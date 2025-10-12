#!/usr/bin/env python3

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import pandas as pd
import requests
from datetime import datetime, timedelta
from scipy.special import expit as sigmoid
import os

app = FastAPI(title="Bengaluru Flood Prediction API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CSV_PATH = os.path.join(os.path.dirname(__file__), "..", "src", "bengaluru_flood_with_drainage.csv")
OPENWEATHER_API_KEY = "4dac20c17e89610bc98a5475436d99cc"

class FloodPredictionRequest(BaseModel):
    ward_name: str
    date: str

class FloodPredictionResponse(BaseModel):
    ward_name: str
    date: str
    latitude: float
    longitude: float
    total_rain_24h: float
    max_hourly_rain: float
    previous_day_rain: float
    flood_probability: float
    risk_level: str
    data_source: str
    vulnerability_score: float
    drainage_metrics: Optional[Dict[str, float]] = None
    drainage_available: bool

class WardInfo(BaseModel):
    ward_name: str
    latitude: float
    longitude: float
    flood_count: float
    vulnerability_score: float
    drainage_index: Optional[float] = None

def flood_probability(rain_mm, prev_rain_mm, vuln, drainage_features,
                      intercept=-3.0, alpha=0.10, beta=3.0, gamma=0.05,
                      delta=-2.5):
    valid_drainage = [v for v in drainage_features.values() if v is not None]
    drainage_score = sum(valid_drainage) / len(valid_drainage) if valid_drainage else 0.0

    return float(sigmoid(
        intercept + alpha * rain_mm + gamma * prev_rain_mm + beta * vuln + delta * drainage_score
    ))

def get_openmeteo_rain(lat, lon, date_str):
    target = datetime.strptime(date_str, "%Y-%m-%d").date()
    today = datetime.now().date()

    if target >= today:
        base_url = "https://api.open-meteo.com/v1/forecast"
    else:
        base_url = "https://archive-api.open-meteo.com/v1/archive"

    url = (
        f"{base_url}?latitude={lat}&longitude={lon}"
        f"&hourly=rain&daily=rain_sum&timezone=Asia%2FKolkata"
        f"&start_date={date_str}&end_date={date_str}"
    )
    try:
        r = requests.get(url, timeout=15)
        r.raise_for_status()
        j = r.json()

        if "daily" not in j or "hourly" not in j:
            print(f"⚠️ Open-Meteo API returned incomplete data structure")
            return None, None, "Incomplete data structure from Open-Meteo API"

        daily_data = j.get("daily", {})
        hourly_data = j.get("hourly", {})
        
        rain_sum = daily_data.get("rain_sum", [])
        if not rain_sum or len(rain_sum) == 0:
            print(f"⚠️ No rain_sum data available from Open-Meteo")
            return None, None, "No rainfall data available from Open-Meteo API"
        
        total_rain = rain_sum[0] if rain_sum[0] is not None else 0.0
        
        hourly_rain = hourly_data.get("rain", [])
        if not hourly_rain or len(hourly_rain) == 0:
            print(f"⚠️ No hourly rain data available from Open-Meteo")
            max_hour = 0.0
        else:
            max_hour = max(hourly_rain) if hourly_rain else 0.0
        
        return total_rain, max_hour, None
    except requests.exceptions.RequestException as e:
        print(f"⚠️ Network error fetching Open-Meteo rainfall: {e}")
        return None, None, f"Network error: Unable to connect to Open-Meteo API"
    except Exception as e:
        print(f"⚠️ Error fetching Open-Meteo rainfall: {e}")
        return None, None, f"API error: {str(e)}"

def get_openweather_forecast(lat, lon, date_str):
    try:
        url = (
            f"https://api.openweathermap.org/data/2.5/forecast"
            f"?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=metric"
        )
        resp = requests.get(url, timeout=15)
        resp.raise_for_status()
        data = resp.json()

        if "list" not in data:
            print(f"⚠️ OpenWeatherMap API returned no forecast data")
            return None, None, "No forecast data available from OpenWeatherMap API"

        forecast_list = data.get("list", [])
        if not forecast_list or len(forecast_list) == 0:
            print(f"⚠️ Empty forecast list from OpenWeatherMap")
            return None, None, "Empty forecast data from OpenWeatherMap API"

        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        total_rain = 0.0
        max_hourly = 0.0
        found_data = False

        for entry in forecast_list:
            ts = datetime.fromtimestamp(entry["dt"]).date()
            if ts == target_date:
                found_data = True
                rain = entry.get("rain", {}).get("3h", 0.0)
                if rain is not None:
                    total_rain += rain
                    max_hourly = max(max_hourly, rain)

        if not found_data:
            print(f"⚠️ No forecast data for target date {date_str}")
            return None, None, f"No forecast data available for date {date_str}"

        return total_rain, max_hourly, None  # None means no error
    except requests.exceptions.RequestException as e:
        print(f"⚠️ Network error fetching OpenWeatherMap forecast: {e}")
        return None, None, f"Network error: Unable to connect to OpenWeatherMap API"
    except Exception as e:
        print(f"⚠️ Error fetching OpenWeatherMap forecast: {e}")
        return None, None, f"API error: {str(e)}"

def get_previous_day_rain(lat, lon, date_str):
    prev_date = (datetime.strptime(date_str, "%Y-%m-%d") - timedelta(days=1)).strftime("%Y-%m-%d")
    total, _, error = get_openmeteo_rain(lat, lon, prev_date)
    if error:
        print(f"⚠️ Warning: Could not fetch previous day rain data: {error}")
        return 0.0
    return total or 0.0

@app.get("/")
async def root():
    return {"message": "Bengaluru Flood Prediction API", "version": "1.0.0"}

@app.get("/wards", response_model=List[WardInfo])
async def get_wards():
    try:
        df = pd.read_csv(CSV_PATH)
        df = df.dropna(subset=["Ward Name", "latitude", "longitude", "flood_count"])
        
        ward_data = []
        for ward in df["Ward Name"].unique():
            ward_df = df[df["Ward Name"] == ward]
            first_row = ward_df.iloc[0]
            vuln_score = first_row["flood_count"] / df["flood_count"].max()
            
            drainage_index = None
            if "drainage_index" in df.columns:
                drainage_index = float(first_row.get("drainage_index", 0))
            
            ward_data.append(WardInfo(
                ward_name=ward,
                latitude=float(first_row["latitude"]),
                longitude=float(first_row["longitude"]),
                flood_count=float(first_row["flood_count"]),
                vulnerability_score=float(vuln_score),
                drainage_index=drainage_index
            ))
        
        return sorted(ward_data, key=lambda x: x.ward_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading ward data: {str(e)}")

@app.post("/predict", response_model=FloodPredictionResponse)
async def predict_flood(request: FloodPredictionRequest):
    try:
        df = pd.read_csv(CSV_PATH)
        df = df.dropna(subset=["latitude", "longitude", "flood_count"])
        match = df[df["Ward Name"].str.contains(request.ward_name, case=False, na=False)]
        
        if match.empty:
            raise HTTPException(status_code=404, detail=f"Ward '{request.ward_name}' not found in dataset")
        
        lat, lon = match.iloc[0][["latitude", "longitude"]]
        vuln = match.iloc[0]["flood_count"] / df["flood_count"].max()
        
        drainage_cols = [
            "primary_drain_km", "secondary_drain_km",
            "tertiary_drain_km", "total_drain_km", "drainage_index"
        ]

        col_map = {c.lower().replace(" ", "_"): c for c in df.columns}
        drainage_features = {}

        for key in drainage_cols:
            if key in col_map:
                col = col_map[key]
                df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
                col_min, col_max = df[col].min(), df[col].max()
                norm_value = 0.0
                if col_max > col_min:
                    norm_value = (match.iloc[0][col] - col_min) / (col_max - col_min)
                drainage_features[key] = norm_value
            else:
                drainage_features[key] = None
        
        try:
            target = datetime.strptime(request.date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
        today = datetime.now().date()
        
        if target <= today:
            total_rain, max_hourly_rain, error = get_openmeteo_rain(lat, lon, request.date)
            if error:
                raise HTTPException(
                    status_code=503, 
                    detail=f"Weather data unavailable: {error}. Please try again later or contact support."
                )
            source = "Open-Meteo (historical)"
        else:
            rain_meteo, hour_meteo, error_meteo = get_openmeteo_rain(lat, lon, request.date)
            rain_owm, hour_owm, error_owm = get_openweather_forecast(lat, lon, request.date)
            
            if error_meteo and error_owm:
                raise HTTPException(
                    status_code=503,
                    detail=f"Weather forecast unavailable: Open-Meteo error: {error_meteo}, OpenWeatherMap error: {error_owm}. Please try again later."
                )
            elif error_meteo:
                if rain_owm is None:
                    raise HTTPException(
                        status_code=503,
                        detail=f"Weather forecast unavailable: {error_owm}. Please try again later."
                    )
                total_rain = rain_owm
                max_hourly_rain = hour_owm
                source = "OpenWeatherMap (forecast only)"
                print(f"⚠️ Using OpenWeatherMap only due to Open-Meteo error: {error_meteo}")
            elif error_owm:
                if rain_meteo is None:
                    raise HTTPException(
                        status_code=503,
                        detail=f"Weather forecast unavailable: {error_meteo}. Please try again later."
                    )
                total_rain = rain_meteo
                max_hourly_rain = hour_meteo
                source = "Open-Meteo (forecast only)"
                print(f"⚠️ Using Open-Meteo only due to OpenWeatherMap error: {error_owm}")
            else:
                total_rain = max(rain_meteo, rain_owm)
                max_hourly_rain = max(hour_meteo, hour_owm)
                source = "Open-Meteo + OpenWeatherMap"
                if abs(rain_meteo - rain_owm) > 2.0:
                    print(f"⚠️ Forecasts differ: Open-Meteo={rain_meteo:.1f} mm, OpenWeather={rain_owm:.1f} mm")
        
        if total_rain is None or max_hourly_rain is None:
            raise HTTPException(
                status_code=503,
                detail="Invalid weather data received. Please try again later or contact support."
            )
        
        prev_day_rain = get_previous_day_rain(lat, lon, request.date)
        
        rain_effective = max_hourly_rain * 2 + total_rain * 0.5
        
        if rain_effective < 0:
            print(f"⚠️ Warning: Negative effective rainfall calculated: {rain_effective}")
            rain_effective = 0.0
        
        p = flood_probability(rain_effective, prev_day_rain, vuln, drainage_features)
        
        if p > 0.7:
            risk_level = "HIGH"
        elif p > 0.4:
            risk_level = "MODERATE"
        else:
            risk_level = "LOW"
        
        drainage_available = any(v is not None for v in drainage_features.values())
        drainage_metrics = {k: v for k, v in drainage_features.items() if v is not None} if drainage_available else None
        
        return FloodPredictionResponse(
            ward_name=request.ward_name,
            date=request.date,
            latitude=float(lat),
            longitude=float(lon),
            total_rain_24h=float(total_rain),
            max_hourly_rain=float(max_hourly_rain),
            previous_day_rain=float(prev_day_rain),
            flood_probability=float(p),
            risk_level=risk_level,
            data_source=source,
            vulnerability_score=float(vuln),
            drainage_metrics=drainage_metrics,
            drainage_available=drainage_available
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
