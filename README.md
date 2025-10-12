# 🌊 Bengaluru Flood Probability Checker

## 🧩 Problem Statement

Bengaluru faces frequent **urban flooding** due to poor drainage, rapid urbanization, and unpredictable rainfall patterns.  
However, residents and authorities often lack **localized and timely flood predictions** — existing weather apps only show general forecasts, not **ward-level flood probabilities**.  
This makes it difficult to plan responses, warn citizens, or allocate resources effectively.

Hence, there is a need for a **data-driven, ward-specific flood prediction system** that combines real-time rainfall forecasts and historical flood data to predict the likelihood of flooding accurately.

---

## 🌱 SHE — Social, Human, Environmental Impact

### 🧍‍♂️ Social Impact
- Helps citizens prepare for potential floods in their own wards.  
- Provides **localized early warnings**, improving community safety.  
- Assists **BBMP** and disaster response teams in taking preventive measures.

### 💖 Human Impact
- Reduces risk to lives and property by predicting flood-prone areas in advance.  
- Raises awareness about local flood vulnerability and encourages preparedness.  
- Supports **urban planners** in identifying critical infrastructure that needs upgrades.

### 🌿 Environmental Impact
- Encourages **sustainable urban planning** and better stormwater management.  
- Reduces post-flood damage and pollution through proactive mitigation.  
- Promotes the use of **open environmental data** (Open-Meteo, IMD, OpenWeather).

---

## ⚡ WOW Factors

### 🌍 Interactive Front End
A visual **map-based interface** of Bengaluru wards — users can simply click a ward to check flood risk instead of typing.

### ☔ Hybrid Forecasting Model
Uses both **Open-Meteo** and **OpenWeatherMap** APIs — automatically chooses the higher rainfall prediction for improved safety.

### 🧠 Smart Flood Probability Model
Incorporates rainfall, previous-day saturation, and historical flood complaint data using a **logistic regression model** calibrated for Bengaluru.

### 📊 Ward-Level Precision
Predictions are made for **individual wards**, offering **hyperlocal insights** instead of citywide estimates.

### 🕐 Works for Both Past and Future
Can analyze **past rainfall** (for validation) and **forecast future flooding** probabilities.

### ⚙ Completely Automated
Fetches data live from APIs, processes it, and returns a clear, **human-readable flood probability** result.

---

## 💡 Solution Overview

Our project, the **Bengaluru Flood Probability Checker**, is a **predictive analytics tool** that uses machine learning and real-time weather data to estimate flood risk across city wards.

### 🧭 How It Works
1. The user selects a **ward** through an interactive map-based front end.  
2. The system retrieves rainfall data from **Open-Meteo (past)** and **OpenWeatherMap (forecast)** APIs.  
3. A logistic model computes flood probability using:
   - Total rainfall  
   - Previous day rainfall (soil saturation)  
   - Historical flood frequency (ward vulnerability)  
4. The model outputs a **flood probability score** and **risk level (Low / Moderate / High)**.  

This system empowers **citizens, planners, and local authorities** with **data-driven flood awareness**, helping reduce the impact of urban flooding in Bengaluru.

---

## 🚀 Steps to Run the Project

### 🖥 Backend Setup
1. Install dependencies:
   ```bash
   pip install -r requirements.txt

2. python start_backend.py

Open a new terminal instance and follow ahead;

### Frontend Setup
1. npm install
2. npm run dev
