'use client';

import { useEffect, useState } from 'react';

export function useFeatureFlags() {
  const [features, setFeatures] = useState<Record<string, boolean> | null>(null);

  useEffect(() => {
    let active = true;

    void fetch('/api/me/features', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active && data?.features) {
          setFeatures(data.features as Record<string, boolean>);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  return features;
}
