import React, { useState } from 'react';
import { useAppContext, Mode } from '../../context/AppContext';
import MicButton from '../MicButton/MicButton';
import ModeSelector from '../ModeSelector/ModeSelector';
import StatusText from '../StatusText/StatusText';
import HistoryPane from '../HistoryPane/HistoryPane';
import SettingsPane from '../SettingsPane/SettingsPane';
import UpdateBanner from '../UpdateBanner/UpdateBanner';
import './Overlay.css';

type Tab = 'mic' | 'history' | 'settings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'mic',      label: 'Mic' },
  { id: 'history',  label: 'History' },
  { id: 'settings', label: 'Settings' },
];

export default function Overlay(): React.ReactElement {
  const { setListening, setStatus, mode, setMode, status } = useAppContext();
  const [activeTab, setActiveTab] = useState<Tab>('mic');

  function handleMicDown(): void {
    setListening(true);
    setStatus('listening');
    window.electronAPI?.micStart();
  }

  function handleMicUp(): void {
    setListening(false);
    setStatus('idle');
    window.electronAPI?.micStop();
  }

  function handleModeChange(newMode: Mode): void {
    setMode(newMode);
    window.electronAPI?.modeChange(newMode);
  }

  return (
    <div className="overlay">
      <div className="overlay__drag-handle" />

      <div className="overlay__header">
        <span className="overlay__wordmark">WhispPro</span>
        <nav className="overlay__tabs" aria-label="Navigation">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className="overlay__tab"
              data-active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              aria-selected={activeTab === tab.id}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="overlay__body">
        {activeTab === 'mic' && (
          <div className="overlay__mic-view">
            <MicButton onMicDown={handleMicDown} onMicUp={handleMicUp} />
            <StatusText status={status} />
            <ModeSelector value={mode} onChange={handleModeChange} />
          </div>
        )}
        {activeTab === 'history'  && <HistoryPane />}
        {activeTab === 'settings' && <SettingsPane />}
      </div>

      <UpdateBanner />
    </div>
  );
}
