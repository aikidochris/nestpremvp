import { useState } from 'react';
import { useMapEvents } from 'react-leaflet';

export const MapContextMenu = ({ isAdmin, onAddHome }: { isAdmin: boolean, onAddHome: (lat: number, lng: number) => void }) => {
    const [position, setPosition] = useState<{ x: number, y: number, lat: number, lng: number } | null>(null);

    useMapEvents({
        contextmenu(e) {
            if (!isAdmin) return;
            console.log('⚡ RIGHT CLICK DETECTED at', e.latlng); // Debug Log
            e.originalEvent.preventDefault(); // Stop browser menu

            // Capture screen coordinates for the menu position
            setPosition({
                x: e.originalEvent.clientX,
                y: e.originalEvent.clientY,
                lat: e.latlng.lat,
                lng: e.latlng.lng
            });
        },
        click() {
            // Close menu on normal click
            if (position) setPosition(null);
        }
    });

    if (!position) return null;

    return (
        <div
            className="fixed bg-white shadow-xl rounded-lg p-2 z-[10000] border border-slate-200"
            style={{ top: position.y, left: position.x }}
        >
            <button
                className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 text-slate-700 text-sm font-medium w-full text-left"
                onClick={(e) => {
                    e.stopPropagation(); // vital to prevent map click from closing immediately if bubbling
                    console.log('➕ Add Home Clicked');
                    onAddHome(position.lat, position.lng);
                    setPosition(null);
                }}
            >
                <span>🏠</span> Add Home Here
            </button>
        </div>
    );
};
