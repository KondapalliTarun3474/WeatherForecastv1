import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';

// Component to bundle map updates
function ChangeView({ center }) {
    const map = useMap();
    map.setView(center, map.getZoom());
    return null;
}

const ForecastMap = ({ lat, lon }) => {
    // Leaflet needs to know the container height
    const position = [lat || 51.505, lon || -0.09];

    return (
        <MapContainer center={position} zoom={13} scrollWheelZoom={false} className="h-full w-full rounded-xl z-0">
            <ChangeView center={position} />
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {lat && lon && (
                <Marker position={position}>
                    <Popup>
                        Selected Location <br /> {lat.toFixed(2)}, {lon.toFixed(2)}
                    </Popup>
                </Marker>
            )}
        </MapContainer>
    );
};

export default ForecastMap;
