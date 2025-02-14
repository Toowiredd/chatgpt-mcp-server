import dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class ConfigService {
  private static instance: ConfigService;
  private config: {
    apiKey: string;
    httpPort: number;
    rateLimitRequests: number;
    rateLimitWindow: number;
  };

  private constructor() {
    dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

    this.config = {
      apiKey: process.env.API_KEY || '',
      httpPort: parseInt(process.env.HTTP_PORT || '3001', 10),
      rateLimitRequests: parseInt(process.env.RATE_LIMIT_REQUESTS || '50', 10),
      rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10),
    };

    if (!this.config.apiKey) {
      throw new Error('API_KEY environment variable is required');
    }
  }

  static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  get apiKey(): string {
    return this.config.apiKey;
  }

  get httpPort(): number {
    return this.config.httpPort;
  }

  get rateLimitRequests(): number {
    return this.config.rateLimitRequests;
  }

  get rateLimitWindow(): number {
    return this.config.rateLimitWindow;
  }
}