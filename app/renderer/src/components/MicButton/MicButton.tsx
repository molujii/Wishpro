import React from 'react';
import { useAppContext } from '../../context/AppContext';
import './MicButton.css';

interface MicButtonProps {
  onMicDown: () => void;
  onMicUp: () => void;
}

export default function MicButton({ onMicDown, onMicUp }: MicButtonProps): React.ReactElement {
  const { listening } = useAppContext();

  return (
    <button
      className="mic-button"
      data-listening={listening}
      onMouseDown={onMicDown}
      onMouseUp={onMicUp}
      onMouseLeave={onMicUp}
      aria-label={listening ? 'Stop recording' : 'Start recording'}
      aria-pressed={listening}
    >
      <svg
        className="mic-icon"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect x="9" y="2" width="6" height="11" rx="3" fill="currentColor" />
        <path
          d="M5 10a7 7 0 0 0 14 0"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="12"
          y1="17"
          x2="12"
          y2="21"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <line
          x1="9"
          y1="21"
          x2="15"
          y2="21"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
