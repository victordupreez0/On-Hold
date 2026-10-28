import 'leaflet/dist/leaflet.css';

import { Fragment, useEffect } from 'react';
import { Circle, MapContainer, TileLayer, useMap } from 'react-leaflet';

import { colors, heatRgba } from '@/theme';
import type { ScamMapProps } from './ScamMap';

// Same heat recipe as native; inlined to keep react-native-maps out of the web bundle.
const HEAT_LAYERS = [1, 0.88, 0.76, 0.64, 0.53, 0.43, 0.34, 0.26, 0.19, 0.13];
const heatRadius = (t: number) => 1800 + t * 4800;

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 11, { duration: 0.5 });
  }, [map, lat, lng]);
  return null;
}

/** Web map for the browser preview. Limitation: public OSM tiles, swap for a keyed tile provider before launch. */
export function ScamMap({ areas, selected, onSelect, center }: ScamMapProps) {
  const focus = areas.find((a) => a.name === selected);
  const max = Math.max(1, ...areas.map((a) => a.count));
  return (
    <div style={{ height: 320, width: '100%', borderRadius: 24, overflow: 'hidden' }} aria-label="Heat map of reported scams by suburb">
      {/* Greyscale tiles keep the map calm and let the heat carry the meaning. */}
      <style>{'.onhold-tiles { filter: grayscale(1) contrast(0.9) brightness(1.06); }'}</style>
      <MapContainer center={[center.lat, center.lng]} zoom={center.zoomedIn ? 10 : 5} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="onhold-tiles"
        />
        {areas.map((a) => {
          const t = a.count / max;
          return (
            <Fragment key={a.name}>
              {HEAT_LAYERS.map((k) => (
                <Circle
                  key={k}
                  center={[a.lat, a.lng]}
                  radius={heatRadius(t) * k}
                  pathOptions={{ stroke: false, fillColor: heatRgba(t, 1), fillOpacity: 0.11 }}
                  eventHandlers={{ click: () => onSelect(a.name) }}
                />
              ))}
              {a.name === selected && (
                <Circle center={[a.lat, a.lng]} radius={heatRadius(t)} pathOptions={{ color: colors.ink, weight: 2, fill: false }} interactive={false} />
              )}
            </Fragment>
          );
        })}
        {focus && <FlyTo lat={focus.lat} lng={focus.lng} />}
      </MapContainer>
    </div>
  );
}
