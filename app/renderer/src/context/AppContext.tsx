import React, { createContext, useCallback, useContext, useState } from 'react';
import { AppStateSnapshot, TranscriptReadyPayload } from '../types/electron';

export type Status = 'idle' | 'listening' | 'transcribing' | 'polishing' | 'completed' | 'error';
export type Mode   = 'conversation' | 'coding' | 'custom';

interface AppState {
  listening:      boolean;
  status:         Status;
  mode:           Mode;
  lastTranscript: TranscriptReadyPayload | null;
  setListening:   (v: boolean) => void;
  setStatus:      (v: Status) => void;
  setMode:        (v: Mode) => void;
  syncFromBackend: (snapshot: AppStateSnapshot) => void;
}

export const AppContext = createContext<AppState>({
  listening:       false,
  status:          'idle',
  mode:            'conversation',
  lastTranscript:  null,
  setListening:    () => undefined,
  setStatus:       () => undefined,
  setMode:         () => undefined,
  syncFromBackend: () => undefined,
});

export function AppProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [listening,      setListening]     = useState(false);
  const [status,         setStatus]        = useState<Status>('idle');
  const [mode,           setMode]          = useState<Mode>('conversation');
  const [lastTranscript, setLastTranscript] = useState<TranscriptReadyPayload | null>(null);

  const syncFromBackend = useCallback((snapshot: AppStateSnapshot) => {
    setStatus(snapshot.status as Status);
    setMode(snapshot.mode as Mode);
    setListening(snapshot.status === 'listening');
    if (snapshot.lastTranscript) setLastTranscript(snapshot.lastTranscript);
  }, []);

  return (
    <AppContext.Provider value={{
      listening, status, mode, lastTranscript,
      setListening, setStatus, setMode, syncFromBackend,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppState {
  return useContext(AppContext);
}
