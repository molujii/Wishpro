import React, { createContext, useContext, useState } from 'react';

export type Status = 'idle' | 'listening' | 'transcribing';
export type Mode = 'conversation' | 'coding' | 'custom';

interface AppState {
  listening: boolean;
  status: Status;
  mode: Mode;
  setListening: (v: boolean) => void;
  setStatus: (v: Status) => void;
  setMode: (v: Mode) => void;
}

export const AppContext = createContext<AppState>({
  listening: false,
  status: 'idle',
  mode: 'conversation',
  setListening: () => undefined,
  setStatus: () => undefined,
  setMode: () => undefined,
});

export function AppProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [mode, setMode] = useState<Mode>('conversation');

  return (
    <AppContext.Provider value={{ listening, status, mode, setListening, setStatus, setMode }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppState {
  return useContext(AppContext);
}
