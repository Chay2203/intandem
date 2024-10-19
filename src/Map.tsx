'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MapPin, Search, X, List } from "lucide-react"

const customIcon = L.icon({
  iconUrl: 'https://cdn0.iconfinder.com/data/icons/small-n-flat/24/678111-map-marker-512.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
})

function MapEvents({ onMapClick }: { onMapClick: (e: L.LeafletMouseEvent) => void }) {
  useMapEvents({
    click: onMapClick,
  })
  return null
}

export default function Component() {
  const [pins, setPins] = useState<Pin[]>([])
  const [newPin, setNewPin] = useState<Pin | null>(null)
  const [mapRef, setMapRef] = useState<L.Map | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')

  const bangaloreCoords: [number, number] = [12.9716, 77.5946]

  useEffect(() => {
    const storedPins = localStorage.getItem('mapPins')
    if (storedPins) {
      setPins(JSON.parse(storedPins))
    }
  }, [])

  useEffect(() => {
    if (pins.length > 0) {
      localStorage.setItem('mapPins', JSON.stringify(pins))
    }
  }, [pins])

  const handleMapClick = useCallback(async (e: L.LeafletMouseEvent) => {
    const { lat, lng } = e.latlng
    let address = 'Fetching address...'

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      const data = await response.json()
      address = data.display_name
    } catch (error) {
      console.error('Error fetching address:', error)
      address = 'Address not available'
    }

    setNewPin({
      id: Date.now().toString(),
      lat,
      lng,
      remark: '',
      address,
    })
  }, [])

  const handleRemarkChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (newPin) {
      setNewPin(prev => prev ? { ...prev, remark: e.target.value } : null)
    }
  }, [newPin])

  const handlePinSubmit = useCallback(() => {
    if (newPin) {
      setPins(prevPins => [...prevPins, newPin])
      setNewPin(null)
    }
  }, [newPin])

  const handlePinClick = useCallback((pin: Pin) => {
    if (mapRef) {
      mapRef.flyTo([pin.lat, pin.lng], 15, {
        duration: 1.5,
      })
    }
  }, [mapRef])
  
  const handlePinDelete = useCallback((id: string) => {
    setPins(prevPins => {
        const updatedPins = prevPins.filter(pin => pin.id !== id);
        if (updatedPins.length === 0) {
            localStorage.removeItem('mapPins');
        } else {
            localStorage.setItem('mapPins', JSON.stringify(updatedPins));
        }
        return updatedPins;
    });
}, []);


  const filteredPins = useMemo(() => 
    pins.filter(pin => 
      pin.remark.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pin.address.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [pins, searchTerm]
  )

  const renderPinCard = (pin: Pin) => (
    <Card key={pin.id} className={`mb-4 hover:shadow-md transition-shadow duration-200 ${viewMode === 'grid' ? 'w-full sm:w-1/2 md:w-1/3 lg:w-1/2 p-2' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start flex-1 cursor-pointer" onClick={() => handlePinClick(pin)}>
            <MapPin className="mr-3 h-5 w-5 text-blue-500 mt-1 flex-shrink-0" />
            <div>
              <p className="font-semibold text-gray-800">{pin.remark || 'No remark'}</p>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{pin.address}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handlePinDelete(pin.id)}
            className="ml-2 text-gray-500 hover:text-red-500"
          >
            <X size={20} />
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="flex h-screen bg-gray-100">
      <Card className="w-1/3 m-4 overflow-hidden shadow-lg">
        <CardContent className="p-6">
          <h2 className="text-3xl font-bold mb-6 text-gray-800">Saved Pins</h2>
          <div className="flex justify-between items-center mb-6">
            <div className="relative flex-grow mr-4">
              <Input
                type="text"
                placeholder="Search pins..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 rounded-md"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            </div>
            <div className="flex">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}
                className="mr-2"
              >
                <List size={20} />
              </Button>
            </div>
          </div>
          <ScrollArea className="h-[calc(100vh-240px)]">
            <div className={`${viewMode === 'grid' ? 'flex flex-wrap -mx-2' : ''}`}>
              {filteredPins.map(renderPinCard)}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      <div className="flex-1 relative">
        <MapContainer center={bangaloreCoords} zoom={11} style={{ height: '100%', width: '100%' }} ref={setMapRef}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <MapEvents onMapClick={handleMapClick} />
          {pins.map((pin) => (
            <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={customIcon}>
              <Popup>
                <div className="p-2">
                  <p className="font-semibold text-gray-800">{pin.remark || 'No remark'}</p>
                  <p className="text-sm text-gray-600 mt-1">{pin.address}</p>
                </div>
              </Popup>
            </Marker>
          ))}
          {newPin && (
            <Marker position={[newPin.lat, newPin.lng]} icon={customIcon}>
              <Popup>
                <div className="w-64 p-2">
                  <Textarea
                    value={newPin.remark}
                    onChange={handleRemarkChange}
                    placeholder="Enter your remark"
                    className="w-full p-2 border rounded mb-2"
                  />
                  <p className="text-sm text-gray-600 mb-2"><strong>Address:</strong> {newPin.address}</p>
                  <Button onClick={handlePinSubmit} className="w-full bg-blue-500 hover:bg-blue-600 text-white">
                    Save Pin
                  </Button>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  )
}

interface Pin {
  id: string;
  lat: number;
  lng: number;
  remark: string;
  address: string;
}
