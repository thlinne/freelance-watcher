import { Project } from "./scraper";

export interface MatchConfig {
  whitelist: string[];
  blacklist: string[];
}

function normalize(text: string): string {
  return text.toLowerCase();
}

function containsKeyword(text: string, keyword: string): boolean {
  return normalize(text).includes(normalize(keyword));
}

function projectText(project: Project): string {
  return [
    project.title,
    project.company,
    project.location,
    project.workplaceType,
    project.contractType,
  ].join(" ");
}

export function matchesProject(project: Project, config: MatchConfig): boolean {
  const text = projectText(project);

  // Blacklist check – if ANY blacklist keyword is found, exclude immediately
  for (const keyword of config.blacklist) {
    if (containsKeyword(text, keyword)) {
      return false;
    }
  }

  // Whitelist check – if whitelist is empty, all non-blacklisted projects match
  if (config.whitelist.length === 0) return true;

  // At least ONE whitelist keyword must be found
  for (const keyword of config.whitelist) {
    if (containsKeyword(text, keyword)) {
      return true;
    }
  }

  return false;
}

export function filterProjects(
  projects: Project[],
  config: MatchConfig
): Project[] {
  return projects.filter((p) => matchesProject(p, config));
}
