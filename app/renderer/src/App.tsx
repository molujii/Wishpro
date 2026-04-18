import React, { useEffect } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import Overlay from './components/Overlay/Overlay';

function BackendBridge(): null {
  const { setStatus, setListening, syncFromBackend } = useAppContext();

  useEffect(() => {
    // Sync initial state from backend on mount
    window.electronAPI?.getAppState().then((snapshot) => {
      syncFromBackend(snapshot);
    });

    // Push listeners from backend
    window.electronAPI?.onStatusChange(({ status }) => {
      setStatus(status);
      setListening(status === 'listening');
    });

    window.electronAPI?.onBackendError((_payload) => {
      setStatus('error');
      setListening(false);
    });

    // Hotkey: will drive hold-to-speak in a future iteration
    window.electronAPI?.onHotkeyPressed(() => {
      // TODO: wire hotkey to mic start/stop toggle
    });
  }, []); // intentionally empty — listeners registered once on mount

  return null;
}

export default function App(): React.ReactElement {
  return (
    <AppProvider>
      <BackendBridge />
      <Overlay />
    </AppProvider>
  );
}
