import { LogEventPayload } from '../types/ipc';

type LogLevel = 'info' | 'warn' | 'error';
type SendFn = (channel: string, payload: LogEventPayload) => void;

export class Logger {
  constructor(private readonly send: SendFn) {}

  info(message: string): void {
    this.log('info', message);
  }

  warn(message: string): void {
    this.log('warn', message);
  }

  error(message: string): void {
    this.log('error', message);
  }

  private log(level: LogLevel, message: string): void {
    const payload: LogEventPayload = { level, message, ts: new Date().toISOString() };
    console.log(`[${level.toUpperCase()}] ${message}`);
    this.send('backend:log-event', payload);
  }
}
