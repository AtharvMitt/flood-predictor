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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/5 backdrop-blur-xl rounded-3xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <span className="text-2xl">🗺️</span>
            </div>
            <h3 className="text-2xl font-bold text-white">Select Ward on Map</h3>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center text-white text-xl transition-all duration-200 hover:scale-105"
          >
            ×
          </button>
        </div>

        {/* Map Content */}
        <div className="p-6">
          {!mapLoaded ? (
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-12 text-center text-slate-300 border border-white/10">
              <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <div className="animate-spin text-3xl">🗺️</div>
              </div>
              <h4 className="text-2xl font-bold text-white mb-3">Loading Interactive Map</h4>
              <p className="text-lg">Preparing detailed map of Bangalore wards...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Map Container */}
              <div className="relative bg-slate-800 rounded-2xl overflow-hidden border border-white/10" style={{ height: '600px' }}>
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
                <div className="absolute top-6 left-6 bg-white/10 backdrop-blur-xl text-white p-4 rounded-2xl border border-white/20 z-10">
                  <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                    <span>📊</span>
                    Legend
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: '#6b7280' }}></div>
                      <span>Ward Boundary</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }}></div>
                      <span>Selected Ward</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded" style={{ backgroundColor: '#60a5fa' }}></div>
                      <span>Hovered Ward</span>
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                <div className="absolute bottom-6 left-6 right-6 bg-white/10 backdrop-blur-xl text-white p-4 rounded-2xl border border-white/20 z-10">
                  <p className="text-sm text-center font-medium">
                    🖱️ Click on any ward boundary to select it
                  </p>
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
