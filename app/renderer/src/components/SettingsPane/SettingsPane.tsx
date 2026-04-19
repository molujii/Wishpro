import React, { useEffect, useState } from 'react';
import type { AppSettings } from '../../types/electron';
import './SettingsPane.css';

const DEFAULT: AppSettings = {
  speechProvider:  'mock',
  speechModelPath: '',
  speechExecPath:  'whisper-cpp',
  speechLanguage:  'en',
  textProvider:    'mock',
  textModel:       'llama3',
  textOllamaUrl:   'http://localhost:11434',
  textEnhancement: 'normal',
};

export default function SettingsPane(): React.ReactElement {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT);
  const [status,   setStatus]   = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [loaded,   setLoaded]   = useState(false);

  useEffect(() => {
    window.electronAPI?.getSettings?.().then((s) => {
      setSettings({ ...DEFAULT, ...s });
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  function patch<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    setSettings(prev => ({ ...prev, [key]: value }));
  }

  async function handleSave(): Promise<void> {
    setStatus('saving');
    try {
      const saved = await window.electronAPI?.saveSettings?.(settings);
      if (saved) setSettings(saved);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }

  if (!loaded) {
    return <div className="settings-pane__loading">Loading…</div>;
  }

  return (
    <div className="settings-pane">

      {/* ── Speech section ── */}
      <section className="settings-section">
        <h3 className="settings-section__title">Speech Model</h3>

        <label className="settings-field">
          <span className="settings-field__label">Provider</span>
          <select
            className="settings-field__select"
            value={settings.speechProvider}
            onChange={e => patch('speechProvider', e.target.value as AppSettings['speechProvider'])}
          >
            <option value="mock">Mock (dev / testing)</option>
            <option value="whisper-cpp">Whisper (local)</option>
          </select>
        </label>

        {settings.speechProvider === 'whisper-cpp' && (
          <>
            <label className="settings-field">
              <span className="settings-field__label">Model path</span>
              <input
                className="settings-field__input"
                type="text"
                placeholder="/path/to/ggml-base.en.bin"
                value={settings.speechModelPath}
                onChange={e => patch('speechModelPath', e.target.value)}
              />
            </label>

            <label className="settings-field">
              <span className="settings-field__label">Executable</span>
              <input
                className="settings-field__input"
                type="text"
                placeholder="whisper-cpp"
                value={settings.speechExecPath}
                onChange={e => patch('speechExecPath', e.target.value)}
              />
            </label>

            <label className="settings-field">
              <span className="settings-field__label">Language</span>
              <select
                className="settings-field__select"
                value={settings.speechLanguage}
                onChange={e => patch('speechLanguage', e.target.value)}
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="zh">Chinese</option>
                <option value="ja">Japanese</option>
                <option value="auto">Auto-detect</option>
              </select>
            </label>
          </>
        )}
      </section>

      {/* ── Text / LLM section ── */}
      <section className="settings-section">
        <h3 className="settings-section__title">Text Model</h3>

        <label className="settings-field">
          <span className="settings-field__label">Provider</span>
          <select
            className="settings-field__select"
            value={settings.textProvider}
            onChange={e => patch('textProvider', e.target.value as AppSettings['textProvider'])}
          >
            <option value="mock">Mock (dev / testing)</option>
            <option value="ollama">Ollama (local LLM)</option>
          </select>
        </label>

        {settings.textProvider === 'ollama' && (
          <>
            <label className="settings-field">
              <span className="settings-field__label">Ollama URL</span>
              <input
                className="settings-field__input"
                type="text"
                placeholder="http://localhost:11434"
                value={settings.textOllamaUrl}
                onChange={e => patch('textOllamaUrl', e.target.value)}
              />
            </label>

            <label className="settings-field">
              <span className="settings-field__label">Model</span>
              <input
                className="settings-field__input"
                type="text"
                placeholder="llama3"
                value={settings.textModel}
                onChange={e => patch('textModel', e.target.value)}
              />
            </label>

            <label className="settings-field">
              <span className="settings-field__label">Enhancement</span>
              <select
                className="settings-field__select"
                value={settings.textEnhancement}
                onChange={e => patch('textEnhancement', e.target.value as AppSettings['textEnhancement'])}
              >
                <option value="light">Light — minimal corrections</option>
                <option value="normal">Normal</option>
                <option value="heavy">Heavy — full rewrite</option>
              </select>
            </label>
          </>
        )}
      </section>

      {/* ── Save button ── */}
      <div className="settings-pane__footer">
        <button
          className="settings-pane__save"
          onClick={handleSave}
          disabled={status === 'saving'}
        >
          {status === 'saving' ? 'Saving…'
            : status === 'saved' ? 'Saved'
            : status === 'error' ? 'Error — retry'
            : 'Save settings'}
        </button>

        {settings.speechProvider === 'whisper-cpp' && (
          <p className="settings-pane__hint">
            Install: <code>brew install whisper-cpp</code>
          </p>
        )}
        {settings.textProvider === 'ollama' && (
          <p className="settings-pane__hint">
            Install: <code>brew install ollama &amp;&amp; ollama serve</code>
          </p>
        )}
      </div>

    </div>
  );
}
