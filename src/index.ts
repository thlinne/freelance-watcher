import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import fs from "fs";
import { scrapeProjects } from "./scraper";
import { filterProjects } from "./matcher";
import { sendNotification } from "./mailer";
import { loadSeen, saveSeen, isNew, markAsSeen } from "./store";
import { loadConfig, saveConfig, AppConfig } from "./config";
import { Scheduler } from "./scheduler";

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// State
let lastCheckTime: string = "–";
let lastResults: { project: any; isNew: boolean }[] = [];
let lastError: string | null = null;
let schedulerStarted: boolean = false;

// ── Core check function ──────────────────────────────────────────────────────
async function runCheck(): Promise<void> {
  lastError = null;
  console.log(`[watcher] Check gestartet: ${new Date().toLocaleString("de-DE")}`);

  try {
    const config = loadConfig();
    const projects = await scrapeProjects(config.searchUrl, config.daysBack);
    console.log(`[watcher] ${projects.length} Projekte gefunden`);

    const matched = filterProjects(projects, {
      whitelist: config.whitelist,
      blacklist: config.blacklist,
    });
    console.log(`[watcher] ${matched.length} Projekte nach Filter`);

    let seen = loadSeen();
    const newProjects = matched.filter((p) => isNew(p.id, seen));

    lastCheckTime = new Date().toLocaleString("de-DE");
    lastResults = matched.map((p) => ({
      project: p,
      isNew: isNew(p.id, seen),
    }));

    if (newProjects.length > 0) {
      console.log(`[watcher] ${newProjects.length} neue Projekte – sende E-Mail`);
      await sendNotification(newProjects, config.email);
      for (const p of newProjects) {
        seen = markAsSeen(p.id, seen);
      }
      saveSeen(seen);
    } else {
      console.log("[watcher] Keine neuen Projekte");
    }
  } catch (err: any) {
    lastError = err.message || String(err);
    console.error(`[watcher] Fehler: ${lastError}`);
  }
}

// ── Scheduler setup ──────────────────────────────────────────────────────────
const config = loadConfig();
const scheduler = new Scheduler(
  config.intervalMinutes,
  { activeHours: config.activeHours, activeDays: config.activeDays },
  runCheck
);

// ── API Routes ───────────────────────────────────────────────────────────────

app.get("/api/status", (_req, res) => {
  const cfg = loadConfig();
  res.json({
    lastCheckTime,
    lastError,
    intervalMinutes: cfg.intervalMinutes,
    daysBack: cfg.daysBack,
    activeHours: cfg.activeHours,
    activeDays: cfg.activeDays,
    resultCount: lastResults.length,
    newCount: lastResults.filter((r) => r.isNew).length,
    schedulerStarted,
  });
});

app.get("/api/results", (_req, res) => {
  res.json(lastResults);
});

app.post("/api/check", async (_req, res) => {
  console.log("[api] Manueller Check ausgelöst");
  await runCheck();
  if (!schedulerStarted) {
    scheduler.start();
    schedulerStarted = true;
    console.log("[api] Scheduler gestartet nach erstem manuellen Check");
  }
  res.json({ success: true, lastCheckTime });
});

app.get("/api/config", (_req, res) => {
  const cfg = loadConfig();
  res.json(cfg);
});

app.post("/api/config", (req, res) => {
  try {
    const newConfig: AppConfig = req.body;
    saveConfig(newConfig);
    scheduler.updateInterval(newConfig.intervalMinutes);
    scheduler.updateSchedule({ activeHours: newConfig.activeHours, activeDays: newConfig.activeDays });
    console.log("[api] Konfiguration gespeichert");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/api/reset-seen", (_req, res) => {
  try {
    const seenPath = path.join(__dirname, "../data/seen.json");
    fs.writeFileSync(seenPath, "[]", "utf-8");
    lastResults = lastResults.map((r) => ({ ...r, isNew: true }));
    console.log("[api] seen.json geleert");
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[server] Freelance Watcher läuft auf http://localhost:${PORT}`);
  console.log(`[server] Bitte Einstellungen prüfen und „Jetzt prüfen" klicken.`);
});
