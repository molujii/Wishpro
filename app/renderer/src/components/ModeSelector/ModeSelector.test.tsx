import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ModeSelector from './ModeSelector';

describe('ModeSelector', () => {
  it('renders current value in trigger button', () => {
    render(<ModeSelector value="conversation" onChange={jest.fn()} />);
    expect(screen.getByRole('button')).toHaveTextContent('Conversation');
  });

  it('options list is hidden initially (aria-expanded false)', () => {
    render(<ModeSelector value="conversation" onChange={jest.fn()} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
  });

  it('clicking trigger sets aria-expanded to true', () => {
    render(<ModeSelector value="conversation" onChange={jest.fn()} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows all three mode options when open', () => {
    render(<ModeSelector value="conversation" onChange={jest.fn()} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Conversation' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Coding' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Custom' })).toBeInTheDocument();
  });

  it('calls onChange with correct mode on selection', () => {
    const onChange = jest.fn();
    render(<ModeSelector value="conversation" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.mouseDown(screen.getByRole('option', { name: 'Coding' }));
    expect(onChange).toHaveBeenCalledWith('coding');
  });

  it('marks the selected option with aria-selected', () => {
    render(<ModeSelector value="coding" onChange={jest.fn()} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('option', { name: 'Coding' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: 'Conversation' })).toHaveAttribute('aria-selected', 'false');
  });
});
