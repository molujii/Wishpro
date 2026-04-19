import React from 'react';
import { useUpdater } from '../../hooks/useUpdater';
import './UpdateBanner.css';

export default function UpdateBanner(): React.ReactElement | null {
  const { status, version, percent, installUpdate } = useUpdater();

  if (status === 'idle' || status === 'not-available' || status === 'checking') {
    return null;
  }

  if (status === 'error') {
    return (
      <div className="update-banner update-banner--error" role="alert">
        <span className="update-banner__text">Update check failed</span>
      </div>
    );
  }

  if (status === 'available') {
    return (
      <div className="update-banner" role="status">
        <span className="update-banner__text">
          Update {version ? `v${version}` : ''} available — downloading…
        </span>
      </div>
    );
  }

  if (status === 'downloading') {
    return (
      <div className="update-banner" role="status">
        <span className="update-banner__text">Downloading update…</span>
        <div className="update-banner__progress">
          <div
            className="update-banner__progress-fill"
            style={{ width: `${percent}%` }}
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <span className="update-banner__percent">{percent}%</span>
      </div>
    );
  }

  if (status === 'ready') {
    return (
      <div className="update-banner update-banner--ready" role="status">
        <span className="update-banner__text">
          Update {version ? `v${version}` : ''} ready
        </span>
        <button className="update-banner__action" onClick={installUpdate}>
          Restart
        </button>
      </div>
    );
  }

  return null;
}
