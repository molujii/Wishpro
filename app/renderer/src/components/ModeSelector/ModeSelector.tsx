import React, { useRef, useEffect, useState } from 'react';
import { Mode } from '../../context/AppContext';
import './ModeSelector.css';

const MODE_LABELS: Record<Mode, string> = {
  conversation: 'Conversation',
  coding:       'Coding',
  custom:       'Custom',
};

const MODES: Mode[] = ['conversation', 'coding', 'custom'];

interface ModeSelectorProps {
  value: Mode;
  onChange: (mode: Mode) => void;
}

export default function ModeSelector({ value, onChange }: ModeSelectorProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function handleSelect(mode: Mode): void {
    onChange(mode);
    setOpen(false);
  }

  return (
    <div className="mode-selector" ref={containerRef}>
      <button
        className="mode-selector__trigger"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{MODE_LABELS[value]}</span>
        <svg
          className="mode-selector__chevron"
          data-open={open}
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <ul
        className="mode-selector__list"
        data-open={open}
        role="listbox"
        aria-label="Transcription mode"
      >
        {MODES.map(mode => (
          <li
            key={mode}
            role="option"
            aria-selected={mode === value}
            className="mode-selector__option"
            data-selected={mode === value}
            onMouseDown={() => handleSelect(mode)}
          >
            {MODE_LABELS[mode]}
          </li>
        ))}
      </ul>
    </div>
  );
}
