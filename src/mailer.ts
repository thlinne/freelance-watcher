import nodemailer from "nodemailer";
import { Project } from "./scraper";

export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  user: string;
  password: string;
  recipient: string;
}

function buildEmailHtml(projects: Project[]): string {
  const rows = projects
    .map(
      (p) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">
          <a href="${p.url}" style="font-weight:bold;color:#0066cc;text-decoration:none;">${p.title}</a>
        </td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${p.company}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${p.location}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${p.workplaceType}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${p.contractType}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;">${p.start}</td>
      </tr>`
    )
    .join("");

  return `
    <html>
      <body style="font-family:Arial,sans-serif;font-size:14px;color:#333;">
        <h2 style="color:#0066cc;">🔔 ${projects.length} neue Freelancermap-Ausschreibung(en)</h2>
        <table style="border-collapse:collapse;width:100%;">
          <thead>
            <tr style="background:#f5f5f5;">
              <th style="padding:8px;text-align:left;">Titel</th>
              <th style="padding:8px;text-align:left;">Unternehmen</th>
              <th style="padding:8px;text-align:left;">Ort</th>
              <th style="padding:8px;text-align:left;">Arbeitsort</th>
              <th style="padding:8px;text-align:left;">Vertragsart</th>
              <th style="padding:8px;text-align:left;">Start</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="color:#999;font-size:12px;margin-top:24px;">
          Gesendet von Freelance Watcher · ${new Date().toLocaleString("de-DE")}
        </p>
      </body>
    </html>
  `;
}

export async function sendNotification(
  projects: Project[],
  config: EmailConfig
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: {
      user: config.user,
      pass: config.password,
    },
  });

  const subject =
    projects.length === 1
      ? `🔔 Neues Projekt: ${projects[0].title}`
      : `🔔 ${projects.length} neue Projekte auf Freelancermap`;

  await transporter.sendMail({
    from: `"Freelance Watcher" <${config.user}>`,
    to: config.recipient,
    subject,
    html: buildEmailHtml(projects),
  });

  console.log(`[mailer] E-Mail gesendet: ${subject}`);
}
