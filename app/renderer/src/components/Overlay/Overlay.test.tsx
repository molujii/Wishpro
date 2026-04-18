import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppProvider } from '../../context/AppContext';
import Overlay from './Overlay';

function renderOverlay(): void {
  render(
    <AppProvider>
      <Overlay />
    </AppProvider>
  );
}

describe('Overlay', () => {
  beforeEach(() => {
    (window.electronAPI!.micStart as jest.Mock).mockClear();
    (window.electronAPI!.micStop as jest.Mock).mockClear();
    (window.electronAPI!.modeChange as jest.Mock).mockClear();
  });

  it('renders all three tab buttons', () => {
    renderOverlay();
    expect(screen.getByRole('button', { name: 'Mic' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'History' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
  });

  it('default view shows mic button, status text, and mode selector', () => {
    renderOverlay();
    expect(screen.getByRole('button', { name: 'Start recording' })).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /conversation/i })).toBeInTheDocument();
  });

  it('clicking History tab shows placeholder', () => {
    renderOverlay();
    fireEvent.click(screen.getByRole('button', { name: 'History' }));
    expect(screen.getByText(/History coming in Module 2/i)).toBeInTheDocument();
  });

  it('clicking Settings tab shows placeholder', () => {
    renderOverlay();
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.getByText(/Settings coming in Module 6/i)).toBeInTheDocument();
  });

  it('mousedown on mic button calls electronAPI.micStart', () => {
    renderOverlay();
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Start recording' }));
    expect(window.electronAPI!.micStart).toHaveBeenCalledTimes(1);
  });

  it('mouseup on mic button calls electronAPI.micStop', () => {
    renderOverlay();
    fireEvent.mouseUp(screen.getByRole('button', { name: 'Start recording' }));
    expect(window.electronAPI!.micStop).toHaveBeenCalledTimes(1);
  });

  it('changing mode calls electronAPI.modeChange with correct value', () => {
    renderOverlay();
    // Open the dropdown
    fireEvent.click(screen.getByRole('button', { name: /conversation/i }));
    // Select Coding
    fireEvent.mouseDown(screen.getByRole('option', { name: 'Coding' }));
    expect(window.electronAPI!.modeChange).toHaveBeenCalledWith('coding');
  });
});
