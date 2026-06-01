import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../.env") });

export interface ActiveHours {
  start: number;
  end: number;
}

export interface AppConfig {
  intervalMinutes: number;
  daysBack: number;
  activeHours: ActiveHours;
  activeDays: number[];   // 0=Sun, 1=Mon, ..., 6=Sat
  searchUrl: string;
  whitelist: string[];
  blacklist: string[];
  email: {
    smtpHost: string;
    smtpPort: number;
    user: string;
    password: string;
    recipient: string;
  };
}

const CONFIG_PATH = path.join(__dirname, "../data/config.json");

export function loadConfig(): AppConfig {
  const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
  const config = JSON.parse(raw) as AppConfig;

  // Password from .env or environment (GitHub Actions uses env vars directly)
  const envPassword = process.env.EMAIL_PASSWORD;
  if (!envPassword) {
    console.warn("[config] ⚠ EMAIL_PASSWORD nicht gesetzt!");
  }
  config.email.password = envPassword || "";

  // Email user can also be overridden via env (useful for GitHub Actions)
  if (process.env.EMAIL_USER) {
    config.email.user = process.env.EMAIL_USER;
  }
  if (process.env.EMAIL_RECIPIENT) {
    config.email.recipient = process.env.EMAIL_RECIPIENT;
  }

  // Defaults
  if (!config.daysBack) config.daysBack = 5;
  if (!config.activeHours) config.activeHours = { start: 8, end: 18 };
  if (!config.activeDays) config.activeDays = [1, 2, 3, 4, 5, 6];

  return config;
}

export function saveConfig(config: AppConfig): void {
  const safeCopy = { ...config, email: { ...config.email, password: "" } };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(safeCopy, null, 2), "utf-8");
}
