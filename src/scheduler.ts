export interface ActiveHours {
  start: number; // 0-23
  end: number;   // 0-23
}

export interface ScheduleConfig {
  activeHours: ActiveHours;
  activeDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
}

export function isWithinActiveHours(schedule: ScheduleConfig): boolean {
  const now = new Date();
  const day = now.getDay();   // 0=Sun
  const hour = now.getHours();

  if (!schedule.activeDays.includes(day)) {
    console.log(`[scheduler] Ruhetag (${['So','Mo','Di','Mi','Do','Fr','Sa'][day]}) – übersprungen`);
    return false;
  }

  if (hour < schedule.activeHours.start || hour >= schedule.activeHours.end) {
    console.log(`[scheduler] Außerhalb Aktivzeit (${hour}:xx, aktiv ${schedule.activeHours.start}-${schedule.activeHours.end} Uhr) – übersprungen`);
    return false;
  }

  return true;
}

export class Scheduler {
  private timer: NodeJS.Timeout | null = null;
  private intervalMs: number;
  private job: () => Promise<void>;
  private schedule: ScheduleConfig;

  constructor(intervalMinutes: number, schedule: ScheduleConfig, job: () => Promise<void>) {
    this.intervalMs = intervalMinutes * 60 * 1000;
    this.schedule = schedule;
    this.job = job;
  }

  start(): void {
    if (this.timer) return;
    console.log(`[scheduler] Gestartet – Intervall: ${this.intervalMs / 60000} Min, aktiv ${this.schedule.activeHours.start}-${this.schedule.activeHours.end} Uhr`);
    this.timer = setInterval(async () => {
      if (!isWithinActiveHours(this.schedule)) return;
      console.log(`[scheduler] Automatischer Check: ${new Date().toLocaleString("de-DE")}`);
      await this.job();
    }, this.intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log("[scheduler] Gestoppt");
    }
  }

  updateInterval(newIntervalMinutes: number): void {
    this.intervalMs = newIntervalMinutes * 60 * 1000;
    if (this.timer) {
      this.stop();
      this.start();
    }
    console.log(`[scheduler] Intervall aktualisiert: ${newIntervalMinutes} Minuten`);
  }

  updateSchedule(schedule: ScheduleConfig): void {
    this.schedule = schedule;
    console.log(`[scheduler] Zeitplan aktualisiert`);
  }
}
