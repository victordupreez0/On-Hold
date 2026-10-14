import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

type LoadState<T> = { data?: T; error?: string; loading: boolean };

/**
 * Loads data whenever the screen gains focus, so lists refresh after you come back from
 * a create/edit screen. Keeps the previous data while refreshing to avoid flicker.
 * `key` re-runs the load when a parameter (e.g. a filter or id) changes.
 */
export function useLoad<T>(fn: () => Promise<T>, key = '') {
  // Remembers which key the data belongs to, so a new filter never shows the old filter's rows as current.
  const [state, setState] = useState<LoadState<T> & { key?: string }>({ loading: true });
  const [tick, setTick] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let live = true;
      fn().then(
        (data) => live && setState({ data, loading: false, key }),
        (e: Error) => live && setState({ error: e.message, loading: false, key }),
      );
      return () => {
        live = false;
      };
      // fn is recreated every render; key and tick are the real inputs.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, tick]),
  );

  const reload = () => {
    setState((s) => ({ ...s, loading: true, error: undefined }));
    setTick((t) => t + 1);
  };

  const current: LoadState<T> = state.key === undefined || state.key === key ? state : { loading: true };
  return { data: current.data, error: current.error, loading: current.loading, reload };
}
