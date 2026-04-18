import React, { useEffect, useState } from 'react';
import { Status } from '../../context/AppContext';
import './StatusText.css';

const LABELS: Record<Status, string> = {
  idle:         'Ready',
  listening:    'Listening...',
  transcribing: 'Transcribing...',
  polishing:    'Polishing...',
  completed:    'Done',
  error:        'Error',
};

interface StatusTextProps {
  status: Status;
}

export default function StatusText({ status }: StatusTextProps): React.ReactElement {
  const [displayedStatus, setDisplayedStatus] = useState<Status>(status);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => {
      setDisplayedStatus(status);
      setVisible(true);
    }, 120);
    return () => clearTimeout(t);
  }, [status]);

  return (
    <p
      className="status-text"
      data-visible={visible}
      data-status={displayedStatus}
      aria-live="polite"
    >
      {LABELS[displayedStatus]}
    </p>
  );
}
