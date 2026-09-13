import React from 'react';
import { useSessionMetrics } from '../../hooks/useSessionMetrics';

export function MetricsProvider({ children }: { children: React.ReactNode }) {
  useSessionMetrics();
  return <>{children}</>;
}
