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

  useEffect(() => {
    fetchWards()
    setSelectedDate(new Date().toISOString().split('T')[0])
  }, [])

  const fetchWards = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/wards`)
      if (!response.ok) throw new Error('Failed to fetch wards')
      const data = await response.json()
      setWards(data)
    } catch (err) {
      setError('Failed to load wards. Please check if the backend is running.')
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
    setSelectedWard(wardName)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white" style={{ backgroundColor: '#111827' }}>
      <div className="container mx-auto px-4 py-8" style={{ backgroundColor: 'transparent' }}>
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🌊 Bengaluru Flood Prediction System
          </h1>
          <p className="text-gray-300">
            AI-powered flood risk assessment for Bengaluru wards
          </p>
        </div>

        <div className="max-w-2xl mx-auto bg-gray-800 rounded-lg shadow-xl p-6 mb-8 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Ward
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedWard}
                  onChange={(e) => setSelectedWard(e.target.value)}
                  className="flex-1 p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
                >
                  <option value="">Choose a ward...</option>
                  {wards.map((ward) => (
                    <option key={ward.ward_name} value={ward.ward_name}>
                      {ward.ward_name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowMap(true)}
                  className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  title="Open Map"
                >
                  🗺️
                </button>
              </div>
            </div>

      <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Select Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white"
              />
            </div>
      </div>

          <button
            onClick={handlePredict}
            disabled={loading || !selectedWard || !selectedDate}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '🔄 Predicting...' : '🔮 Predict Flood Risk'}
        </button>

          {error && error !== 'WEATHER_UNAVAILABLE' && (
            <div className="mt-4 p-4 bg-red-900 border border-red-600 text-red-200 rounded-lg">
              <div className="font-semibold mb-2">⚠️ Error</div>
              <div>{error}</div>
            </div>
          )}

          {error === 'WEATHER_UNAVAILABLE' && (
            <div className="mt-4 p-4 bg-yellow-900 border border-yellow-600 text-yellow-200 rounded-lg">
              <div className="font-semibold mb-2">🌧️ Weather Forecast Unavailable</div>
              <div>Weather forecast for the selected date is unavailable. Please try a different date or check back later.</div>
            </div>
          )}
        </div>

        {prediction && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 mb-6 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">
                  Flood Risk Assessment
                </h2>
                <div className={`px-4 py-2 rounded-full font-semibold border ${getRiskColor(prediction.risk_level)}`}>
                  {getRiskIcon(prediction.risk_level)} {prediction.risk_level} RISK
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-400 mb-2">
                    {(prediction.flood_probability * 100).toFixed(1)}%
                  </div>
                  <div className="text-gray-300">Flood Probability</div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-semibold text-white mb-2">
                    {prediction.ward_name}
                  </div>
                  <div className="text-gray-300">
                    📍 {prediction.latitude.toFixed(4)}, {prediction.longitude.toFixed(4)}
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-semibold text-white mb-2">
                    {new Date(prediction.date).toLocaleDateString()}
                  </div>
                  <div className="text-gray-300">Assessment Date</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-4">
                  🌧️ Weather Data
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Total Rain (24h):</span>
                    <span className="font-semibold text-white">{prediction.total_rain_24h.toFixed(1)} mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Max Hourly Rain:</span>
                    <span className="font-semibold text-white">{prediction.max_hourly_rain.toFixed(1)} mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Previous Day Rain:</span>
                    <span className="font-semibold text-white">{prediction.previous_day_rain.toFixed(1)} mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Data Source:</span>
                    <span className="font-semibold text-sm text-blue-400">{prediction.data_source}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700">
                <h3 className="text-xl font-semibold text-white mb-4">
                  📊 Risk Factors
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Vulnerability Score:</span>
                    <span className="font-semibold text-white">{(prediction.vulnerability_score * 100).toFixed(1)}%</span>
                  </div>
                  {prediction.drainage_available && prediction.drainage_metrics && (
                    <>
                      <div className="border-t border-gray-600 pt-3 mt-3">
                        <div className="text-sm font-medium text-gray-300 mb-2">Drainage Metrics:</div>
                        {Object.entries(prediction.drainage_metrics).map(([key, value]) => (
                          <div key={key} className="flex justify-between text-sm">
                            <span className="text-gray-400 capitalize">
                              {key.replace(/_/g, ' ')}:
                            </span>
                            <span className="font-semibold text-white">{(value * 100).toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                  {!prediction.drainage_available && (
                    <div className="text-sm text-gray-400 italic">
                      ℹ️ Drainage data unavailable
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-4">
                📋 Risk Interpretation
              </h3>
              <div className="text-gray-300">
                {prediction.risk_level === 'HIGH' && (
                  <div className="bg-red-900 border-l-4 border-red-500 p-4 rounded">
                    <p className="font-semibold text-red-200">High Risk - Immediate Action Required</p>
                    <p className="text-red-300 mt-2">
                      There is a high probability of flooding in this area. Please take immediate precautions:
                      avoid low-lying areas, prepare emergency supplies, and stay informed about weather updates.
                    </p>
                  </div>
                )}
                {prediction.risk_level === 'MODERATE' && (
                  <div className="bg-orange-900 border-l-4 border-orange-500 p-4 rounded">
                    <p className="font-semibold text-orange-200">Moderate Risk - Stay Alert</p>
                    <p className="text-orange-300 mt-2">
                      There is a moderate risk of flooding. Monitor weather conditions closely and be prepared
                      to take action if conditions worsen.
                    </p>
                  </div>
                )}
                {prediction.risk_level === 'LOW' && (
                  <div className="bg-green-900 border-l-4 border-green-500 p-4 rounded">
                    <p className="font-semibold text-green-200">Low Risk - Normal Conditions</p>
                    <p className="text-green-300 mt-2">
                      The flood risk is low for this area and date. Continue normal activities but stay aware
                      of any weather changes.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <LeafletMapModal
          isOpen={showMap}
          onClose={() => setShowMap(false)}
          wards={wards}
          onWardSelect={handleWardSelect}
          selectedWard={selectedWard}
        />

        <div className="text-center mt-12 text-gray-400">
          <p>Bengaluru Flood Prediction System v4.3 — Powered by AI & Weather Data</p>
        </div>
      </div>
    </div>
  )
}

export default App
