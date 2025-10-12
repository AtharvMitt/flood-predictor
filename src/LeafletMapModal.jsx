import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, GeoJSON, useMap, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import wardBoundaries from './wardBoundaries.json'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

const LeafletMapModal = ({ isOpen, onClose, wards, onWardSelect, selectedWard }) => {
  const [mapLoaded, setMapLoaded] = useState(false)
  const [hoveredWard, setHoveredWard] = useState(null)
  const mapRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setMapLoaded(true), 500)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  const getMapCenter = () => {
    if (wards.length === 0) return [12.9716, 77.5946]
    
    const avgLat = wards.reduce((sum, ward) => sum + ward.latitude, 0) / wards.length
    const avgLon = wards.reduce((sum, ward) => sum + ward.longitude, 0) / wards.length
    return [avgLat, avgLon]
  }

  const getWardStyle = (feature) => {
    const wardName = feature.properties.ward_name
    const isSelected = selectedWard === wardName
    const isHovered = hoveredWard === wardName

    return {
      fillColor: isSelected ? '#3b82f6' : isHovered ? '#60a5fa' : '#6b7280',
      weight: isSelected ? 3 : 2,
      opacity: isSelected ? 1 : 0.8,
      color: isSelected ? '#1d4ed8' : isHovered ? '#2563eb' : '#4b5563',
      fillOpacity: isSelected ? 0.6 : isHovered ? 0.4 : 0.2,
    }
  }

  const handleWardClick = (feature) => {
    const wardName = feature.properties.ward_name
    onWardSelect(wardName)
    onClose()
  }

  const handleWardHover = (feature) => {
    setHoveredWard(feature.properties.ward_name)
  }

  const handleWardLeave = () => {
    setHoveredWard(null)
  }

  const onEachFeature = (feature, layer) => {
    const wardName = feature.properties.ward_name
    const area = feature.properties.area_km2

    layer.bindPopup(`
      <div class="text-center">
        <h3 class="font-semibold text-gray-800">${wardName}</h3>
        <p class="text-sm text-gray-600">Area: ${area} km²</p>
        <button 
          onclick="window.selectWard('${wardName}')"
          class="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
        >
          Select Ward
        </button>
      </div>
    `)

    layer.on('click', () => handleWardClick(feature))

    layer.on('mouseover', () => handleWardHover(feature))
    layer.on('mouseout', handleWardLeave)

    layer.on('mouseover', function() {
      this.setStyle({
        fillColor: '#60a5fa',
        fillOpacity: 0.4,
        color: '#2563eb',
        weight: 2
      })
    })

    layer.on('mouseout', function() {
      this.setStyle(getWardStyle(feature))
    })
  }

  useEffect(() => {
    window.selectWard = (wardName) => {
      onWardSelect(wardName)
      onClose()
    }
    return () => {
      delete window.selectWard
    }
  }, [onWardSelect, onClose])

  if (!isOpen) return null

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
              <div className="relative bg-gray-700 rounded-lg overflow-hidden" style={{ height: '500px' }}>
                <MapContainer
                  center={getMapCenter()}
                  zoom={12}
                  style={{ height: '100%', width: '100%' }}
                  ref={mapRef}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  
                  {/* Ward Boundaries */}
                  <GeoJSON
                    data={wardBoundaries}
                    style={getWardStyle}
                    onEachFeature={onEachFeature}
                  />
                </MapContainer>

                {/* Map Legend */}
                <div className="absolute top-4 left-4 bg-gray-800 bg-opacity-90 text-white p-3 rounded-lg border border-gray-600 z-10">
                  <h4 className="font-semibold text-sm mb-2">Legend</h4>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: '#6b7280' }}></div>
                      <span>Ward Boundary</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
                      <span>Selected Ward</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: '#60a5fa' }}></div>
                      <span>Hovered Ward</span>
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                <div className="absolute bottom-4 left-4 right-4 bg-gray-800 bg-opacity-90 text-white p-3 rounded-lg border border-gray-600 z-10">
                  <p className="text-sm text-center">
                    Click on any ward boundary to select it, or use the list below
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
                      onClick={() => onWardSelect(ward.ward_name)}
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

export default LeafletMapModal
