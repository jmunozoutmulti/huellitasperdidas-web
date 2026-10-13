'use client';

import { GoogleMap, Marker, Circle, useJsApiLoader } from '@react-google-maps/api';

interface MapPickerProps {
    lat: number;
    lng: number;
    radioKm: number;
    zoom: number;
    isDraggable: boolean;
    isDarkMode: boolean;
    circleColor?: string;
    onPositionChange: (lat: number, lng: number) => void;
}

const containerStyle = {
    width: '100%',
    height: '100%',
    borderRadius: '0.75em',
};

const minimalMapStyle: google.maps.MapTypeStyle[] = [
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', stylers: [{ color: '#e9edf1' }] },
    { featureType: 'landscape', stylers: [{ color: '#f5f5f5' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#f0f0f0' }] },
    { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#7a7a7a' }] },
];
const darkMapStyle: google.maps.MapTypeStyle[] = [
    { elementType: 'geometry', stylers: [{ color: '#1d1d1d' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#1d1d1d' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#8a8a8a' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a2a' }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#333333' }] },
    { featureType: 'water', stylers: [{ color: '#0f0f0f' }] },
    { featureType: 'landscape', stylers: [{ color: '#1d1d1d' }] },
    { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#a0a0a0' }] },
];


export default function MapPicker({ lat, lng, radioKm, zoom, isDraggable, isDarkMode, circleColor = '#e70808', onPositionChange }: MapPickerProps) {
    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    });

    if (!isLoaded) {
        return <div className="txt">Cargando mapa...</div>;
    }

    const center = { lat, lng };

    return (
        <GoogleMap
            key={`map-${zoom}-${radioKm}-${lat}-${lng}-${isDarkMode}`}
            mapContainerStyle={containerStyle}
            center={center}
            zoom={zoom}
            options={{
                disableDefaultUI: true,
                styles: isDarkMode ? darkMapStyle : minimalMapStyle,
                gestureHandling: isDraggable ? 'greedy' : 'none', // bloquea pan/zoom del mapa hasta activar
                draggableCursor: isDraggable ? 'default' : 'default',
                zoomControl: false,
                scrollwheel: isDraggable,
                disableDoubleClickZoom: !isDraggable,
            }}
        >
            <Marker
                position={center}
                draggable={isDraggable}
                onDragEnd={(e) => {
                    if (e.latLng) {
                        onPositionChange(e.latLng.lat(), e.latLng.lng());
                    }
                }}
            />
            {radioKm > 0 && (
                <Circle
                    center={center}
                    radius={radioKm * 1000}
                    draggable={isDraggable}
                    onDragEnd={(e) => {
                        if (e.latLng) {
                            onPositionChange(e.latLng.lat(), e.latLng.lng());
                        }
                    }}
                    options={{
                        strokeColor: circleColor,
                        strokeWeight: 1,
                        fillColor: circleColor,
                        fillOpacity: 0.08,
                    }}
                />
            )}
        </GoogleMap>
    );
}