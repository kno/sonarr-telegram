import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import { env } from '../../shared/config/env';
import { AppError } from '../../shared/errors/errors';

export class SonarrClient {
  private http: AxiosInstance;
  constructor(baseURL: string, apiKey: string) {
    this.http = axios.create({ baseURL, headers: { 'X-Api-Key': apiKey } });
    axiosRetry(this.http, { retries: 3, retryDelay: axiosRetry.exponentialDelay });
  }

  static fromEnv(): SonarrClient {
    if (!env.SONARR_URL || !env.SONARR_API_KEY) {
      throw new AppError('ConfigError', 'SONARR_URL/SONARR_API_KEY not configured', 500);
    }
    return new SonarrClient(env.SONARR_URL, env.SONARR_API_KEY);
  }

  async ping(): Promise<boolean> {
    const res = await this.http.get('/system/status');
    return res.status === 200;
  }

  // Placeholder for adding a download via indexer integration.
  async enqueueDownload(_magnetOrUrl: string): Promise<void> {
    // Implement using indexer or download client integration as needed.
  }
}

