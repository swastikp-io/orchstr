export class SafeLogger {
  private static SENSITIVE_KEYS = [
    'password', 'secret', 'token', 'key', 'api_key', 'apikey', 'auth',
    'authorization', 'bearer', 'cookie', 'credit_card', 'ssn'
  ];

  public static sanitize(data: any): any {
    if (!data) return data;
    if (typeof data === 'string') {
      // Redact potential emails or private keys
      let clean = data.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[REDACTED_EMAIL]');
      clean = clean.replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED_TOKEN]');
      return clean;
    }
    if (Array.isArray(data)) {
      return data.map(item => this.sanitize(item));
    }
    if (typeof data === 'object') {
      const sanitized: Record<string, any> = {};
      for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();
        if (this.SENSITIVE_KEYS.some(k => lowerKey.includes(k))) {
          sanitized[key] = '[REDACTED_SECRET]';
        } else {
          sanitized[key] = this.sanitize(value);
        }
      }
      return sanitized;
    }
    return data;
  }

  public static info(message: string, meta?: any): void {
    const timestamp = new Date().toISOString();
    const cleanMeta = meta ? this.sanitize(meta) : '';
    console.error(`[${timestamp}] [INFO] ${message}`, cleanMeta ? JSON.stringify(cleanMeta) : '');
  }

  public static warn(message: string, meta?: any): void {
    const timestamp = new Date().toISOString();
    const cleanMeta = meta ? this.sanitize(meta) : '';
    console.warn(`[${timestamp}] [WARN] ${message}`, cleanMeta ? JSON.stringify(cleanMeta) : '');
  }

  public static error(message: string, error?: any): void {
    const timestamp = new Date().toISOString();
    const cleanErr = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : (error ? this.sanitize(error) : '');
    console.error(`[${timestamp}] [ERROR] ${message}`, cleanErr ? JSON.stringify(cleanErr) : '');
  }
}
