import '@testing-library/jest-dom';

Object.defineProperty(window, 'electronAPI', {
  value: {
    onHotkeyPressed: jest.fn(),
    getSettings:     jest.fn().mockResolvedValue({}),
    micStart:        jest.fn(),
    micStop:         jest.fn(),
    modeChange:      jest.fn(),
  },
  writable: true,
});
