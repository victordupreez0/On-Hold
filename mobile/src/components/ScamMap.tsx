import { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';

import { colors, heatRgba } from '@/theme';
import type { AreaStat } from '@/types';

export type ScamMapProps = {
  areas: AreaStat[];
  selected: string | null;
  onSelect: (suburb: string) => void;
  center: { lat: number; lng: number; zoomedIn: boolean };
};

// Stacked translucent rings fade out from each suburb's centre, so busier areas glow hotter and wider.
export const HEAT_LAYERS = [1, 0.88, 0.76, 0.64, 0.53, 0.43, 0.34, 0.26, 0.19, 0.13];
const MUTED = [{ stylers: [{ saturation: -100 }, { lightness: 8 }] }];
export const heatRadius = (t: number) => 1800 + t * 4800; // metres

export function ScamMap({ areas, selected, onSelect, center }: ScamMapProps) {
  const map = useRef<MapView>(null);
  const max = Math.max(1, ...areas.map((a) => a.count));

  useEffect(() => {
    const area = areas.find((a) => a.name === selected);
    if (area) map.current?.animateToRegion({ latitude: area.lat, longitude: area.lng, latitudeDelta: 0.25, longitudeDelta: 0.25 }, 400);
  }, [selected, areas]);

  return (
    <MapView
      ref={map}
      style={styles.map}
      initialRegion={{
        latitude: center.lat,
        longitude: center.lng,
        latitudeDelta: center.zoomedIn ? 0.45 : 11,
        longitudeDelta: center.zoomedIn ? 0.45 : 11,
      }}
      // Muted base map so the heat carries the meaning: Apple's muted style on iOS, desaturated Google style on Android.
      mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
      customMapStyle={MUTED}
      accessibilityLabel="Heat map of reported scams by suburb">
      {areas.map((a) => {
        const t = a.count / max;
        const center = { latitude: a.lat, longitude: a.lng };
        return [
          ...HEAT_LAYERS.map((k) => (
            <Circle key={`${a.name}-${k}`} center={center} radius={heatRadius(t) * k} fillColor={heatRgba(t, 0.1)} strokeWidth={0} />
          )),
          a.name === selected && (
            <Circle key={`${a.name}-ring`} center={center} radius={heatRadius(t)} strokeColor={colors.ink} strokeWidth={2} fillColor="transparent" />
          ),
          <Marker key={`${a.name}-tap`} coordinate={center} onPress={() => onSelect(a.name)} tracksViewChanges={false} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.tap} accessibilityLabel={`${a.name}: ${a.count} ${a.count === 1 ? 'report' : 'reports'}`} />
          </Marker>,
        ];
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { width: '100%', height: 320, borderRadius: 24 },
  tap: { width: 48, height: 48 },
});
