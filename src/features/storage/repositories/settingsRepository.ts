import type { StorageDatabase } from '@/src/features/storage/client';

const SELECT_SETTING_SQL = 'SELECT value FROM app_settings WHERE key = ? LIMIT 1';

export class SettingsRepository {
  constructor(private readonly database: StorageDatabase) {}

  async setString(key: string, value: string): Promise<void> {
    await this.database.runAsync(
      `INSERT INTO app_settings (key, value)
       VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, value]
    );
  }

  async getString(key: string, fallbackValue: string): Promise<string> {
    const record = await this.database.getFirstAsync<{ value: string }>(SELECT_SETTING_SQL, [key]);
    return record?.value ?? fallbackValue;
  }

  async setBoolean(key: string, value: boolean): Promise<void> {
    await this.setString(key, value ? 'true' : 'false');
  }

  async getBoolean(key: string, fallbackValue: boolean): Promise<boolean> {
    const value = await this.getString(key, fallbackValue ? 'true' : 'false');
    return value === 'true';
  }

  async setNumber(key: string, value: number): Promise<void> {
    await this.setString(key, String(value));
  }

  async getNumber(key: string, fallbackValue: number): Promise<number> {
    const raw = await this.getString(key, String(fallbackValue));
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallbackValue;
  }
}
