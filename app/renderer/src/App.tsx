import React, { useEffect } from 'react';
import { AppProvider } from './context/AppContext';
import Overlay from './components/Overlay/Overlay';

export default function App(): React.ReactElement {
  useEffect(() => {
    window.electronAPI?.onHotkeyPressed(() => {
      // Placeholder: Module 2 will drive actual hold-to-speak via hotkey
    });
  }, []);

  return (
    <AppProvider>
      <Overlay />
    </AppProvider>
  );
}
