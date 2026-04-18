// Renderer → Main
export const IPC_MIC_START          = 'ui:mic-start'             as const;
export const IPC_MIC_STOP           = 'ui:mic-stop'              as const;
export const IPC_MODE_CHANGE        = 'ui:mode-change'           as const;
export const IPC_GET_APP_STATE      = 'ui:get-app-state'         as const;
export const IPC_RETRY_LAST_RUN     = 'ui:retry-last-run'        as const;
export const IPC_CANCEL_CURRENT_RUN = 'ui:cancel-current-run'    as const;

// Main → Renderer
export const IPC_STATUS_CHANGE      = 'backend:status-change'    as const;
export const IPC_STATE_SYNC         = 'backend:state-sync'       as const;
export const IPC_TRANSCRIPT_READY   = 'backend:transcript-ready' as const;
export const IPC_ERROR              = 'backend:error'            as const;
export const IPC_LOG_EVENT          = 'backend:log-event'        as const;
