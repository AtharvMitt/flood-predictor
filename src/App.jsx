import { useState, useEffect } from 'react'
import './App.css'
import LeafletMapModal from './LeafletMapModal'

const API_BASE_URL = 'http://localhost:8000'

function App() {
  const [wards, setWards] = useState([])
  const [selectedWard, setSelectedWard] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [prediction, setPrediction] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showMap, setShowMap] = useState(false)
  const [wardProbabilities, setWardProbabilities] = useState({})
  const [mapLoading, setMapLoading] = useState(false)

  useEffect(() => {
    const initializeApp = async () => {
      const today = new Date().toISOString().split('T')[0]
      setSelectedDate(today)
      
      // First fetch wards, then fetch probabilities
      const wardsData = await fetchWards()
      if (wardsData && wardsData.length > 0) {
        fetchWardProbabilities(today)
      }
    }
    
    initializeApp()
  }, [])

  useEffect(() => {
    if (selectedDate && wards.length > 0) {
      fetchWardProbabilities(selectedDate)
    }
  }, [selectedDate, wards.length])

  const fetchWards = async () => {
    try {
      console.log('Fetching wards from backend...')
      const response = await fetch(`${API_BASE_URL}/wards`)
      if (!response.ok) throw new Error('Failed to fetch wards')
      const data = await response.json()
      console.log('Received wards:', data.length)
      setWards(data)
      return data
    } catch (err) {
      console.error('Failed to fetch wards:', err)
      setError('Failed to load wards. Please check if the backend is running.')
      
      // Fallback: Use sample wards for demo
      const sampleWards = [
        { ward_name: "Koramangala", latitude: 12.9337, longitude: 77.6284, area_km2: 5.2, drainage_index: 0.3, vulnerability_score: 0.7 },
        { ward_name: "Indiranagar", latitude: 12.9716, longitude: 77.6412, area_km2: 4.8, drainage_index: 0.4, vulnerability_score: 0.6 },
        { ward_name: "Jayanagar", latitude: 12.9308, longitude: 77.5838, area_km2: 6.1, drainage_index: 0.5, vulnerability_score: 0.5 },
        { ward_name: "Malleshwaram", latitude: 12.9929, longitude: 77.5708, area_km2: 3.9, drainage_index: 0.6, vulnerability_score: 0.4 },
        { ward_name: "Rajajinagar", latitude: 12.9784, longitude: 77.5610, area_km2: 4.5, drainage_index: 0.7, vulnerability_score: 0.3 }
      ]
      console.log('Using fallback sample wards:', sampleWards.length)
      setWards(sampleWards)
      return sampleWards
    }
  }

  const fetchWardProbabilities = async (date) => {
    setMapLoading(true)
    try {
      console.log('Fetching ward probabilities for date:', date)
      const response = await fetch(`${API_BASE_URL}/predict/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ward_name: 'dummy', // Not used in batch endpoint
          date: date,
        }),
      })

      if (!response.ok) throw new Error('Failed to fetch ward probabilities')
      const data = await response.json()
      
      console.log('Received ward probabilities:', data.ward_probabilities.length, 'wards')
      
      // Convert array to object for faster lookup
      const probabilitiesMap = {}
      data.ward_probabilities.forEach(ward => {
        probabilitiesMap[ward.ward_name] = ward
        console.log(`Ward: ${ward.ward_name}, Probability: ${ward.flood_probability}`)
      })
      setWardProbabilities(probabilitiesMap)
      console.log('Set ward probabilities map:', Object.keys(probabilitiesMap).length, 'wards')
    } catch (err) {
      console.error('Failed to fetch ward probabilities:', err)
      
      // Fallback: Create sample data for demo purposes
      console.log('Creating fallback sample data for demo')
      const sampleProbabilities = {}
      wards.forEach((ward, index) => {
        // Create varied probabilities for demo
        const probability = Math.random() * 0.8 + 0.1 // Random between 0.1 and 0.9
        sampleProbabilities[ward.ward_name] = {
          ward_name: ward.ward_name,
          latitude: ward.latitude,
          longitude: ward.longitude,
          flood_probability: probability,
          risk_level: probability > 0.7 ? "HIGH" : probability > 0.4 ? "MODERATE" : "LOW"
        }
      })
      setWardProbabilities(sampleProbabilities)
      console.log('Set fallback probabilities:', Object.keys(sampleProbabilities).length, 'wards')
    } finally {
      setMapLoading(false)
    }
  }

  const handlePredict = async () => {
    if (!selectedWard || !selectedDate) {
      setError('Please select a ward and date')
      return
    }

    setLoading(true)
    setError('')
    setPrediction(null)

    try {
      const response = await fetch(`${API_BASE_URL}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ward_name: selectedWard,
          date: selectedDate,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.detail || 'Prediction failed'
        
        if (response.status === 503) {
          setError('WEATHER_UNAVAILABLE')
          return
        } else if (response.status === 404) {
          throw new Error(`📍 Location Error: ${errorMessage}`)
        } else if (response.status === 400) {
          throw new Error(`📅 Date Error: ${errorMessage}`)
        } else {
          throw new Error(errorMessage)
        }
      }

      const data = await response.json()
      setPrediction(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getRiskColor = (riskLevel) => {
    switch (riskLevel) {
      case 'HIGH': return 'text-red-200 bg-red-900 border-red-500'
      case 'MODERATE': return 'text-orange-200 bg-orange-900 border-orange-500'
      case 'LOW': return 'text-green-200 bg-green-900 border-green-500'
      default: return 'text-gray-200 bg-gray-700 border-gray-500'
    }
  }

  const getRiskIcon = (riskLevel) => {
    switch (riskLevel) {
      case 'HIGH': return '🔴'
      case 'MODERATE': return '🟠'
      case 'LOW': return '🟢'
      default: return '⚪'
    }
  }

  const handleWardSelect = (wardName) => {
    console.log('Ward selected:', wardName)
    setSelectedWard(wardName)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl mb-6 shadow-2xl">
            <span className="text-3xl">🌊</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            Bengaluru Flood Prediction
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            AI-powered flood risk assessment for Bengaluru wards using real-time weather data and drainage analysis
          </p>
        </div>

        {/* Main Input Card */}
        <div className="max-w-4xl mx-auto bg-white/5 backdrop-blur-xl rounded-3xl shadow-2xl p-8 mb-8 border border-white/10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Ward Selection */}
            <div className="space-y-4">
              <label className="block text-lg font-semibold text-white mb-3">
                📍 Select Ward
              </label>
              <select
                value={selectedWard}
                onChange={(e) => setSelectedWard(e.target.value)}
                className="w-full p-4 bg-white/10 border border-white/20 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-400 backdrop-blur-sm transition-all duration-200 hover:bg-white/15"
              >
                <option value="">
                  {wards.length === 0 ? "Loading wards..." : "Choose a ward..."}
                </option>
                {wards.map((ward) => (
                  <option key={ward.ward_name} value={ward.ward_name}>
                    {ward.ward_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Map Button */}
            <div className="space-y-4">
              <label className="block text-lg font-semibold text-white mb-3">
                🗺️ Interactive Map
              </label>
              <button
                onClick={() => setShowMap(true)}
                className="w-full h-13 py-8 p-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transform hover:scale-105"
                title="Open Interactive Map"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <span>Open Map</span>
              </button>
            </div>

            {/* Date Selection */}
            <div className="space-y-4">
              <label className="block text-lg font-semibold text-white mb-3">
                📅 Select Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full p-4 bg-white/10 border border-white/20 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/15"
              />
            </div>
          </div>

          {/* Predict Button */}
          <button
            onClick={handlePredict}
            disabled={loading || !selectedWard || !selectedDate}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-slate-600 disabled:to-slate-700 text-white py-4 px-8 rounded-2xl font-semibold text-lg transition-all duration-200 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Analyzing...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <span>🔮</span>
                <span>Predict Flood Risk</span>
              </div>
            )}
          </button>

          {/* Error Messages */}
          {error && error !== 'WEATHER_UNAVAILABLE' && (
            <div className="mt-6 p-6 bg-red-500/10 border border-red-500/20 text-red-200 rounded-2xl backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-6 h-6 bg-red-500/20 rounded-full flex items-center justify-center">
                  <span className="text-red-400">⚠️</span>
                </div>
                <div className="font-semibold">Error</div>
              </div>
              <div className="text-red-300">{error}</div>
            </div>
          )}

          {error === 'WEATHER_UNAVAILABLE' && (
            <div className="mt-6 p-6 bg-yellow-500/10 border border-yellow-500/20 text-yellow-200 rounded-2xl backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center">
                  <span className="text-yellow-400">🌧️</span>
                </div>
                <div className="font-semibold">Weather Forecast Unavailable</div>
              </div>
              <div className="text-yellow-300">Weather forecast for the selected date is unavailable. Please try a different date or check back later.</div>
            </div>
          )}
        </div>

        {prediction && (
          <div className="max-w-6xl mx-auto">
            {/* Main Risk Assessment Card */}
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl shadow-2xl p-8 mb-8 border border-white/10">
              <div className="flex flex-col lg:flex-row items-center justify-between mb-8 gap-6">
                <div className="text-center lg:text-left">
                  <h2 className="text-3xl font-bold text-white mb-2">
                    Flood Risk Assessment
                  </h2>
                  <p className="text-slate-300 text-lg">
                    Analysis for {prediction.ward_name}
                  </p>
                </div>
                <div className={`px-6 py-3 rounded-2xl font-bold text-lg border-2 ${getRiskColor(prediction.risk_level)} backdrop-blur-sm`}>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getRiskIcon(prediction.risk_level)}</span>
                    <span>{prediction.risk_level} RISK</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Flood Probability */}
                <div className="text-center bg-white/5 rounded-2xl p-6 backdrop-blur-sm border border-white/10">
                  <div className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent mb-3">
                    {(prediction.flood_probability * 100).toFixed(1)}%
                  </div>
                  <div className="text-slate-300 text-lg font-medium">Flood Probability</div>
                  <div className="w-full bg-slate-700 rounded-full h-2 mt-4">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${prediction.flood_probability * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Location Info */}
                <div className="text-center bg-white/5 rounded-2xl p-6 backdrop-blur-sm border border-white/10">
                  <div className="text-2xl font-bold text-white mb-3">
                    {prediction.ward_name}
                  </div>
                  <div className="text-slate-300 text-sm">
                    📍 {prediction.latitude.toFixed(4)}, {prediction.longitude.toFixed(4)}
                  </div>
                </div>

                {/* Assessment Date */}
                <div className="text-center bg-white/5 rounded-2xl p-6 backdrop-blur-sm border border-white/10">
                  <div className="text-2xl font-bold text-white mb-3">
                    {new Date(prediction.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div className="text-slate-300 text-sm">Assessment Date</div>
                </div>
              </div>
            </div>

            {/* Weather Data and Risk Factors */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Weather Data Card */}
              <div className="bg-white/5 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">🌧️</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white">Weather Data</h3>
                </div>
                <div className="space-y-6">
                  <div className="flex justify-between items-center py-3 border-b border-white/10">
                    <span className="text-slate-300 text-lg">Total Rain (24h)</span>
                    <span className="font-bold text-white text-xl">{prediction.total_rain_24h.toFixed(1)} mm</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/10">
                    <span className="text-slate-300 text-lg">Max Hourly Rain</span>
                    <span className="font-bold text-white text-xl">{prediction.max_hourly_rain.toFixed(1)} mm</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/10">
                    <span className="text-slate-300 text-lg">Previous Day Rain</span>
                    <span className="font-bold text-white text-xl">{prediction.previous_day_rain.toFixed(1)} mm</span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-slate-300 text-lg">Data Source</span>
                    <span className="font-semibold text-blue-400 text-sm bg-blue-500/10 px-3 py-1 rounded-full">
                      {prediction.data_source}
                    </span>
                  </div>
                </div>
              </div>

              {/* Risk Factors Card */}
              <div className="bg-white/5 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">📊</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white">Risk Factors</h3>
                </div>
                <div className="space-y-6">
                  <div className="flex justify-between items-center py-3 border-b border-white/10">
                    <span className="text-slate-300 text-lg">Vulnerability Score</span>
                    <div className="flex items-center gap-3">
                      <div className="w-20 bg-slate-700 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-1000"
                          style={{ width: `${prediction.vulnerability_score * 100}%` }}
                        ></div>
                      </div>
                      <span className="font-bold text-white text-xl">{(prediction.vulnerability_score * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  
                  {prediction.drainage_available && prediction.drainage_metrics && (
                    <div className="pt-4">
                      <div className="text-lg font-semibold text-slate-300 mb-4">Drainage Metrics</div>
                      <div className="space-y-3">
                        {Object.entries(prediction.drainage_metrics).map(([key, value]) => (
                          <div key={key} className="flex justify-between items-center">
                            <span className="text-slate-400 capitalize text-sm">
                              {key.replace(/_/g, ' ')}
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-slate-700 rounded-full h-1.5">
                                <div 
                                  className="bg-gradient-to-r from-green-500 to-blue-500 h-1.5 rounded-full transition-all duration-1000"
                                  style={{ width: `${value * 100}%` }}
                                ></div>
                              </div>
                              <span className="font-semibold text-white text-sm">{(value * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {!prediction.drainage_available && (
                    <div className="text-center py-4 text-slate-400 italic">
                      ℹ️ Drainage data unavailable
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Risk Interpretation Card */}
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">📋</span>
                </div>
                <h3 className="text-2xl font-bold text-white">Risk Interpretation</h3>
              </div>
              
              <div className="text-slate-300">
                {prediction.risk_level === 'HIGH' && (
                  <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
                        <span className="text-red-400 text-xl">🔴</span>
                      </div>
                      <p className="font-bold text-red-200 text-xl">High Risk - Immediate Action Required</p>
                    </div>
                    <p className="text-red-300 text-lg leading-relaxed">
                      There is a high probability of flooding in this area. Please take immediate precautions:
                      avoid low-lying areas, prepare emergency supplies, and stay informed about weather updates.
                    </p>
                  </div>
                )}
                {prediction.risk_level === 'MODERATE' && (
                  <div className="bg-orange-500/10 border border-orange-500/20 p-6 rounded-2xl backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center">
                        <span className="text-orange-400 text-xl">🟠</span>
                      </div>
                      <p className="font-bold text-orange-200 text-xl">Moderate Risk - Stay Alert</p>
                    </div>
                    <p className="text-orange-300 text-lg leading-relaxed">
                      There is a moderate risk of flooding. Monitor weather conditions closely and be prepared
                      to take action if conditions worsen.
                    </p>
                  </div>
                )}
                {prediction.risk_level === 'LOW' && (
                  <div className="bg-green-500/10 border border-green-500/20 p-6 rounded-2xl backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                        <span className="text-green-400 text-xl">🟢</span>
                      </div>
                      <p className="font-bold text-green-200 text-xl">Low Risk - Normal Conditions</p>
                    </div>
                    <p className="text-green-300 text-lg leading-relaxed">
                      The flood risk is low for this area and date. Continue normal activities but stay aware
                      of any weather changes.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Map Modal */}
        <LeafletMapModal
          isOpen={showMap}
          onClose={() => setShowMap(false)}
          wards={wards}
          onWardSelect={handleWardSelect}
          selectedWard={selectedWard}
          wardProbabilities={wardProbabilities}
          mapLoading={mapLoading}
        />

        {/* Footer */}
        <div className="text-center mt-16 text-slate-400">
          <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-sm px-6 py-3 rounded-full border border-white/10">
            <span className="text-lg">🌊</span>
            <p className="text-sm font-medium">Bengaluru Flood Prediction System v4.3 — Powered by AI & Weather Data</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
