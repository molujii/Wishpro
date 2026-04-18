import React from 'react';
import { render, screen } from '@testing-library/react';
import StatusText from './StatusText';

describe('StatusText', () => {
  it('renders "Ready" for idle status', () => {
    render(<StatusText status="idle" />);
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('renders "Listening..." for listening status', () => {
    render(<StatusText status="listening" />);
    expect(screen.getByText('Listening...')).toBeInTheDocument();
  });

  it('renders "Transcribing..." for transcribing status', () => {
    render(<StatusText status="transcribing" />);
    expect(screen.getByText('Transcribing...')).toBeInTheDocument();
  });

  it('has aria-live="polite"', () => {
    render(<StatusText status="idle" />);
    expect(screen.getByText('Ready')).toHaveAttribute('aria-live', 'polite');
  });
});
