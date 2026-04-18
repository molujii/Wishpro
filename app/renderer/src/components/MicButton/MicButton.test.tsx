import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppContext } from '../../context/AppContext';
import MicButton from './MicButton';

function renderWithContext(listening: boolean, onMicDown = jest.fn(), onMicUp = jest.fn()): void {
  render(
    <AppContext.Provider value={{
      listening,
      status: 'idle',
      mode: 'conversation',
      setListening: jest.fn(),
      setStatus: jest.fn(),
      setMode: jest.fn(),
    }}>
      <MicButton onMicDown={onMicDown} onMicUp={onMicUp} />
    </AppContext.Provider>
  );
}

describe('MicButton', () => {
  it('shows "Start recording" aria-label when not listening', () => {
    renderWithContext(false);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Start recording');
  });

  it('shows "Stop recording" aria-label when listening', () => {
    renderWithContext(true);
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Stop recording');
  });

  it('aria-pressed is false when not listening', () => {
    renderWithContext(false);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('aria-pressed is true when listening', () => {
    renderWithContext(true);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onMicDown on mousedown', () => {
    const onMicDown = jest.fn();
    renderWithContext(false, onMicDown);
    fireEvent.mouseDown(screen.getByRole('button'));
    expect(onMicDown).toHaveBeenCalledTimes(1);
  });

  it('calls onMicUp on mouseup', () => {
    const onMicUp = jest.fn();
    renderWithContext(false, jest.fn(), onMicUp);
    fireEvent.mouseUp(screen.getByRole('button'));
    expect(onMicUp).toHaveBeenCalledTimes(1);
  });

  it('calls onMicUp on mouseleave', () => {
    const onMicUp = jest.fn();
    renderWithContext(true, jest.fn(), onMicUp);
    fireEvent.mouseLeave(screen.getByRole('button'));
    expect(onMicUp).toHaveBeenCalledTimes(1);
  });

  it('sets data-listening attribute correctly', () => {
    renderWithContext(true);
    expect(screen.getByRole('button')).toHaveAttribute('data-listening', 'true');
  });
});
