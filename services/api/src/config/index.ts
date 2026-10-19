import dotenv from 'dotenv';
import path from 'path';

// Load .env if present
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface AppConfig {
  nodeEnv: string;
  port: number;
  host: string;
  databaseUrl: string;
  authSecret: string;
  guestTokenSecret: string;
  jwtExpiresIn: string;
  webAppOrigin: string;
  emergency: {
    primary: string;
    police: string;
    ambulance: string;
    fire: string;
    countryCode: string;
    disclaimer: string;
  };
  uploads: {
    localDir: string;
    maxFileSize: number; // in bytes, 5MB
    allowedMimeTypes: string[];
  };
  rateLimit: {
    windowMs: number;
    maxGeneral: number;
    maxIncidentSubmit: number;
    maxAuth: number;
  };
}

export const config: AppConfig = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  host: process.env.HOST || '0.0.0.0',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/accident_alarm?schema=public',
  authSecret: process.env.AUTH_SECRET || 'development_super_secret_auth_token_key_min_32_chars_long',
  guestTokenSecret: process.env.GUEST_TOKEN_SECRET || 'development_guest_access_token_secret_key_32_chars',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  webAppOrigin: process.env.WEB_APP_ORIGIN || 'http://localhost:3000',
  emergency: {
    primary: process.env.EMERGENCY_HELPLINE_PRIMARY || '',
    police: process.env.EMERGENCY_HELPLINE_POLICE || '',
    ambulance: process.env.EMERGENCY_HELPLINE_AMBULANCE || '',
    fire: process.env.EMERGENCY_HELPLINE_FIRE || '',
    countryCode: process.env.EMERGENCY_COUNTRY_CODE || 'NG',
    disclaimer: process.env.EMERGENCY_SERVICE_DISCLAIMER ||
      'This application is an incident reporting aid and does NOT guarantee immediate dispatch. For life-threatening emergencies, dial the official emergency numbers immediately.'
  },
  uploads: {
    localDir: process.env.OBJECT_STORAGE_LOCAL_DIR || './uploads',
    maxFileSize: 5 * 1024 * 1024, // 5MB max
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp']
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins
    maxGeneral: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    maxIncidentSubmit: parseInt(process.env.INCIDENT_RATE_LIMIT_MAX || '10', 10),
    maxAuth: 15
  }
};
