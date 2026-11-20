import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().transform((val) => parseInt(val, 10)).default("4000"),
  HOST: z.string().default("0.0.0.0"),
  CORS_ORIGIN: z.string().default("*"),

  // Base de datos (PostgreSQL)
  DATABASE_URL: z.string().default("postgresql://localhost:5432/stoka_db"),

  // Tokens JWT
  JWT_SECRET: z.string().min(16).default("super_secret_jwt_key_stoka_prod_2026_min32chars"),
  JWT_EXPIRES_IN: z.string().default("1d"),
  REFRESH_TOKEN_SECRET: z.string().min(16).default("super_secret_refresh_key_stoka_2026"),

  // Google OAuth
  GOOGLE_CLIENT_ID: z
    .string()
    .default("957967377042-43prhumdo6iquul8ir79r1h5h40earl9.apps.googleusercontent.com"),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_ANDROID_CLIENT_ID: z.string().optional(),
  GOOGLE_IOS_CLIENT_ID: z.string().optional(),

  // SMTP Email para OTP
  SMTP_HOST: z.string().default("smtp.resend.com"),
  SMTP_PORT: z.string().transform((val) => parseInt(val, 10)).default("587"),
  SMTP_SECURE: z.string().transform((val) => val === "true").default("false"),
  SMTP_USER: z.string().default("resend"),
  SMTP_PASS: z.string().default("test_password"),
  FROM_EMAIL: z.string().default('"Stoka Seguridad" <no-reply@stoka.app>'),

  // Configuración OTP
  OTP_EXPIRATION_MINUTES: z.string().transform((val) => parseInt(val, 10)).default("10"),
  OTP_MAX_ATTEMPTS: z.string().transform((val) => parseInt(val, 10)).default("3"),
});

export const env = envSchema.parse(process.env);
