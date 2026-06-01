/**
 * run-once.ts
 * Einstiegspunkt für GitHub Actions – kein Express-Server, nur einmal prüfen.
 * Ruhezeiten werden hier NICHT geprüft (das erledigt der cron-Zeitplan in der workflow.yml).
 */
import dotenv from "dotenv";
dotenv.config();

import { scrapeProjects } from "./scraper";
import { filterProjects } from "./matcher";
import { sendNotification } from "./mailer";
import { loadSeen, saveSeen, isNew, markAsSeen } from "./store";
import { loadConfig } from "./config";
import fs from "fs";
import path from "path";

async function main(): Promise<void> {
  console.log(`[run-once] Start: ${new Date().toISOString()}`);

  const config = loadConfig();
  console.log(`[run-once] Whitelist: ${JSON.stringify(config.whitelist)}`);
  console.log(`[run-once] Blacklist: ${JSON.stringify(config.blacklist)}`);
  const projects = await scrapeProjects(config.searchUrl, config.daysBack);
  console.log(`[run-once] ${projects.length} Projekte gefunden`);

  if (projects.length > 0) {
    console.log(`[run-once] Erstes Projekt: ${JSON.stringify(projects[0].title)}`);
  }

  const matched = filterProjects(projects, {
    whitelist: config.whitelist,
    blacklist: config.blacklist,
  });
  console.log(`[run-once] ${matched.length} Projekte nach Filter`);

  // seen.json: In GitHub Actions liegt diese Datei im Cache (siehe workflow.yml)
  let seen = loadSeen();
  const newProjects = matched.filter((p) => isNew(p.id, seen));
  console.log(`[run-once] ${newProjects.length} neue Projekte`);

  if (newProjects.length > 0) {
    await sendNotification(newProjects, config.email);
    for (const p of newProjects) {
      seen = markAsSeen(p.id, seen);
    }
    saveSeen(seen);
    console.log(`[run-once] E-Mail gesendet, seen.json aktualisiert`);
  } else {
    console.log("[run-once] Keine neuen Projekte – fertig.");
  }
}

main().catch((err) => {
  console.error("[run-once] Fehler:", err);
  process.exit(1);
});
