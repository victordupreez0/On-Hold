import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { colors } from '@/theme';
import type { AreaStat } from '@/types';
import { T } from './ui';

export type ScamMapProps = {
  areas: AreaStat[];
  selected: string | null;
  onSelect: (suburb: string) => void;
  center: { lat: number; lng: number; zoomedIn: boolean };
};

const delta = (zoomedIn: boolean) => (zoomedIn ? 0.35 : 11);

export function bubbleSize(count: number) {
  return Math.min(30 + count * 3, 56);
}

/** Native map: one count bubble per suburb. Suburb only, never exact locations (pitch: location privacy). */
export function ScamMap({ areas, selected, onSelect, center }: ScamMapProps) {
  const map = useRef<MapView>(null);

  useEffect(() => {
    const area = areas.find((a) => a.name === selected);
    if (area) map.current?.animateToRegion({ latitude: area.lat, longitude: area.lng, latitudeDelta: 0.3, longitudeDelta: 0.3 }, 400);
  }, [selected, areas]);

  return (
    <MapView
      ref={map}
      style={styles.map}
      initialRegion={{
        latitude: center.lat,
        longitude: center.lng,
        latitudeDelta: delta(center.zoomedIn),
        longitudeDelta: delta(center.zoomedIn),
      }}
      accessibilityLabel="Map of reported scams by suburb">
      {areas.map((a) => {
        const size = bubbleSize(a.count);
        const on = a.name === selected;
        return (
          <Marker key={a.name} coordinate={{ latitude: a.lat, longitude: a.lng }} onPress={() => onSelect(a.name)} tracksViewChanges={false}>
            <View style={[styles.bubble, { width: size, height: size, borderRadius: size / 2 }, on && styles.bubbleOn]}>
              <T v="label" color={on ? colors.highlighter : colors.ink}>
                {a.count}
              </T>
            </View>
          </Marker>
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { width: '100%', height: 320, borderRadius: 24 },
  bubble: {
    backgroundColor: colors.highlighter,
    borderWidth: 3,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleOn: { backgroundColor: colors.ink },
});
