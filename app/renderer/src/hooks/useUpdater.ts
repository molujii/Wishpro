import { useState, useEffect } from 'react';
import type { UpdateStatusKind, UpdateStatusPayload } from '../types/electron';

export interface UpdaterState {
  status: UpdateStatusKind | 'idle';
  version: string | null;
  percent: number;
  checkForUpdate: () => void;
  installUpdate: () => void;
}

export function useUpdater(): UpdaterState {
  const [status,  setStatus]  = useState<UpdateStatusKind | 'idle'>('idle');
  const [version, setVersion] = useState<string | null>(null);
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    window.electronAPI?.onUpdateStatus?.((payload: UpdateStatusPayload) => {
      setStatus(payload.status);
      if (payload.version !== undefined) setVersion(payload.version);
      if (payload.percent !== undefined) setPercent(payload.percent);
    });
  }, []);

  const checkForUpdate = (): void => { window.electronAPI?.checkForUpdate?.(); };
  const installUpdate  = (): void => { window.electronAPI?.installUpdate?.(); };

  return { status, version, percent, checkForUpdate, installUpdate };
}
