import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';

import { colors } from '@/theme';
import type { ScamMapProps } from './ScamMap';

// Same bubble sizing as native; inlined to keep react-native-maps out of the web bundle.
const bubbleSize = (count: number) => Math.min(30 + count * 3, 56);

function bubble(count: number, on: boolean) {
  const size = bubbleSize(count);
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;border:3px solid ${colors.ink};background:${
      on ? colors.ink : colors.highlighter
    };color:${on ? colors.highlighter : colors.ink};display:flex;align-items:center;justify-content:center;font:600 16px 'AtkinsonHyperlegibleNext_600SemiBold',sans-serif;box-sizing:border-box">${count}</div>`,
  });
}

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 11, { duration: 0.5 });
  }, [map, lat, lng]);
  return null;
}

/** Web map for the browser preview. ponytail: public OSM tiles, swap for a keyed tile provider before launch. */
export function ScamMap({ areas, selected, onSelect, center }: ScamMapProps) {
  const focus = areas.find((a) => a.name === selected);
  return (
    <div style={{ height: 320, width: '100%', borderRadius: 24, overflow: 'hidden' }} aria-label="Map of reported scams by suburb">
      <MapContainer center={[center.lat, center.lng]} zoom={center.zoomedIn ? 10 : 5} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {areas.map((a) => (
          <Marker
            key={a.name}
            position={[a.lat, a.lng]}
            icon={bubble(a.count, a.name === selected)}
            title={`${a.name}: ${a.count} reports`}
            eventHandlers={{ click: () => onSelect(a.name) }}
          />
        ))}
        {focus && <FlyTo lat={focus.lat} lng={focus.lng} />}
      </MapContainer>
    </div>
  );
}
