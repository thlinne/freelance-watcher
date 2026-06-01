import axios from "axios";
import * as cheerio from "cheerio";

export interface Project {
  id: string;
  title: string;
  company: string;
  location: string;
  workplaceType: string;
  contractType: string;
  start: string;
  url: string;
  publishedAt: string;
}

export async function scrapeProjects(searchUrl: string, daysBack: number = 5): Promise<Project[]> {
  // Replace or add the 'created' parameter dynamically
  const url = new URL(searchUrl);
  url.searchParams.set("created", String(daysBack));

  const response = await axios.get(url.toString(), {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept-Language": "de-DE,de;q=0.9,en-US;q=0.8",
    },
    timeout: 15000,
  });

  const $ = cheerio.load(response.data);
  const projects: Project[] = [];

  $("a[href*='/project/']").each((_, el) => {
    const href = $(el).attr("href") || "";

    // Extract project ID from URL (last numeric segment)
    const idMatch = href.match(/-(\d+)$/);
    if (!idMatch) return;

    const id = idMatch[1];
    const url = href.startsWith("http")
      ? href
      : `https://www.freelancermap.com${href}`;

    const title = $(el).text().trim();
    if (!title) return;

    // Walk up to find the surrounding project card
    const card = $(el).closest("li, article, div.project, div[class*='project']");

    const company = card.find("[class*='company'], [class*='client']").first().text().trim() || "–";
    const location = card.find("[class*='location'], [class*='city']").first().text().trim() || "–";
    const workplaceType = card.find("[class*='workplace'], [class*='remote']").first().text().trim() || "–";
    const contractType = card.find("[class*='contract'], [class*='type']").first().text().trim() || "–";
    const start = card.find("[class*='start'], [class*='date']").first().text().trim() || "–";
    const publishedAt = new Date().toISOString();

    projects.push({
      id,
      title,
      company,
      location,
      workplaceType,
      contractType,
      start,
      url,
      publishedAt,
    });
  });

  // Deduplicate by ID
  const seen = new Set<string>();
  return projects.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}
