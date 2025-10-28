"use client";

import { createContext, useContext } from 'react';
import type { LiveApiValue } from '@/hooks/LiveApiProvider';

export const LiveApiContext = createContext<LiveApiValue | null>(null);

export function useLiveApiContext(): LiveApiValue | null {
  return useContext(LiveApiContext);
}
