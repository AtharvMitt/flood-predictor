import { useState, useEffect } from 'react'

const MapModal = ({ isOpen, onClose, wards, onWardSelect, selectedWard }) => {
  const [mapLoaded, setMapLoaded] = useState(false)
  const [hoveredWard, setHoveredWard] = useState(null)

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setMapLoaded(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  if (!isOpen) return null

  const bounds = wards.reduce((acc, ward) => {
    return {
      minLat: Math.min(acc.minLat, ward.latitude),
      maxLat: Math.max(acc.maxLat, ward.latitude),
      minLon: Math.min(acc.minLon, ward.longitude),
      maxLon: Math.max(acc.maxLon, ward.longitude)
    }
  }, {
    minLat: Infinity,
    maxLat: -Infinity,
    minLon: Infinity,
    maxLon: -Infinity
  })

  const mapWidth = 800
  const mapHeight = 600
  const latRange = bounds.maxLat - bounds.minLat
  const lonRange = bounds.maxLon - bounds.minLon

  const getPixelPosition = (lat, lon) => {
    const x = ((lon - bounds.minLon) / lonRange) * mapWidth
    const y = ((bounds.maxLat - lat) / latRange) * mapHeight
    return { x, y }
  }

  const handleWardClick = (ward) => {
    onWardSelect(ward.ward_name)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-xl font-semibold text-white">🗺️ Select Ward on Map</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl transition-colors"
          >
            ×
          </button>
        </div>

        {/* Map Content */}
        <div className="p-4">
          {!mapLoaded ? (
            <div className="bg-gray-700 rounded-lg p-8 text-center text-gray-300">
              <div className="animate-spin text-4xl mb-4">🗺️</div>
              <h4 className="text-xl font-semibold mb-2">Loading Map...</h4>
              <p>Preparing interactive map of Bangalore wards</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Map Container */}
              <div className="relative bg-gray-700 rounded-lg overflow-hidden" style={{ height: mapHeight }}>
                {/* Map Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-800 to-green-600 opacity-30"></div>
                
                {/* Ward Points */}
                {wards.map((ward) => {
                  const position = getPixelPosition(ward.latitude, ward.longitude)
                  const isSelected = selectedWard === ward.ward_name
                  const isHovered = hoveredWard === ward.ward_name
                  
                  return (
                    <div
                      key={ward.ward_name}
                      className={`ward-marker absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-200 ${
                        isSelected 
                          ? 'scale-125 z-20 selected' 
                          : isHovered 
                            ? 'scale-110 z-10' 
                            : 'scale-100 z-0'
                      }`}
                      style={{ left: position.x, top: position.y }}
                      onClick={() => handleWardClick(ward)}
                      onMouseEnter={() => setHoveredWard(ward.ward_name)}
                      onMouseLeave={() => setHoveredWard(null)}
                    >
                      {/* Ward Circle */}
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        isSelected
                          ? 'bg-blue-500 border-blue-300 shadow-lg'
                          : isHovered
                            ? 'bg-blue-400 border-blue-200 shadow-md'
                            : 'bg-blue-600 border-blue-400'
                      }`}></div>
                      
                      {/* Ward Label */}
                      {(isSelected || isHovered) && (
                        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap border border-gray-600">
                          {ward.ward_name}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Map Legend */}
                <div className="absolute top-4 left-4 bg-gray-800 bg-opacity-90 text-white p-3 rounded-lg border border-gray-600">
                  <h4 className="font-semibold text-sm mb-2">Legend</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-600 rounded-full border border-blue-400"></div>
                      <span>Ward Location</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full border border-blue-300 scale-125"></div>
                      <span>Selected Ward</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-400 rounded-full border border-blue-200 scale-110"></div>
                      <span>Hovered Ward</span>
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                <div className="absolute bottom-4 left-4 right-4 bg-gray-800 bg-opacity-90 text-white p-3 rounded-lg border border-gray-600">
                  <p className="text-sm text-center">
                    Click on any ward marker to select it, or use the dropdown below
                  </p>
                </div>
              </div>

              {/* Ward List */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="text-white font-semibold mb-3">All Wards ({wards.length})</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-40 overflow-y-auto dark-scrollbar">
                  {wards.map((ward) => (
                    <button
                      key={ward.ward_name}
                      onClick={() => handleWardClick(ward)}
                      className={`text-left p-2 rounded text-sm transition-colors ${
                        selectedWard === ward.ward_name
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                      }`}
                    >
                      {ward.ward_name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MapModal
