const isDev = import.meta.env.DEV;

export class Logger {
  static log(...args: any[]): void {
    if (isDev) {
      console.log("[DEV]", ...args);
    }
  }

  static warn(...args: any[]): void {
    if (isDev) {
      console.warn("[DEV]", ...args);
    }
  }

  static error(...args: any[]): void {
    if (isDev) {
      console.error("[DEV]", ...args);
    }
  }

  static info(...args: any[]): void {
    if (isDev) {
      console.info("[DEV]", ...args);
    }
  }

  static debug(...args: any[]): void {
    if (isDev) {
      console.debug("[DEV]", ...args);
    }
  }
}
