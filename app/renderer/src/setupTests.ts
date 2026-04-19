import '@testing-library/jest-dom';

Object.defineProperty(window, 'electronAPI', {
  value: {
    onHotkeyPressed: jest.fn(),
    getSettings:     jest.fn().mockResolvedValue({
      speechProvider: 'mock', speechModelPath: '', speechExecPath: 'whisper-cpp', speechLanguage: 'en',
      textProvider: 'mock', textModel: 'llama3', textOllamaUrl: 'http://localhost:11434', textEnhancement: 'normal',
    }),
    saveSettings: jest.fn().mockResolvedValue({}),
    micStart:     jest.fn(),
    micStop:      jest.fn(),
    modeChange:   jest.fn(),
  },
  writable: true,
});
