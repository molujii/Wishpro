import { globalShortcut } from 'electron';

type HotkeyHandler = () => void;

export class HotkeyService {
  private readonly shortcut = 'CommandOrControl+Shift+Space';

  register(handler: HotkeyHandler): void {
    const registered = globalShortcut.register(this.shortcut, handler);
    if (!registered) {
      console.warn(`[WARN] Failed to register hotkey: ${this.shortcut}`);
    }
  }

  unregister(): void {
    globalShortcut.unregisterAll();
  }
}
