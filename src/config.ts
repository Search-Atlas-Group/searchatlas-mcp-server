/**
 * Configuration — loads settings from environment variables or ~/.searchatlasrc file.
 *
 * Auth priority:
 *   1. SEARCHATLAS_TOKEN    → sent as Authorization: Bearer header (preferred)
 *   2. SEARCHATLAS_API_KEY  → sent as X-API-Key header (alternative)
 *
 * Token lookup order:
 *   1. Environment variable (SEARCHATLAS_TOKEN or SEARCHATLAS_API_KEY)
 *   2. ~/.searchatlasrc file (one-time setup)
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export interface Config {
  apiUrl: string;
  apiKey?: string;
  token?: string;
}

/** Read token from ~/.searchatlasrc if it exists. */
function loadRcFile(): Record<string, string> {
  try {
    const rcPath = join(homedir(), ".searchatlasrc");
    const content = readFileSync(rcPath, "utf-8");
    const vars: Record<string, string> = {};
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        vars[key] = val;
      }
    }
    return vars;
  } catch {
    return {};
  }
}

export function loadConfig(): Config {
  const rc = loadRcFile();

  const apiUrl =
    process.env.SEARCHATLAS_API_URL ?? rc.SEARCHATLAS_API_URL ?? "https://mcp.searchatlas.com";
  const token = process.env.SEARCHATLAS_TOKEN ?? rc.SEARCHATLAS_TOKEN;
  const apiKey = process.env.SEARCHATLAS_API_KEY ?? rc.SEARCHATLAS_API_KEY;

  if (!apiKey && !token) {
    throw new Error(
      "Missing credentials. Set up in one of these ways:\n" +
      "  1. Create ~/.searchatlasrc with: SEARCHATLAS_TOKEN=your-jwt-token\n" +
      "  2. Set environment variable: export SEARCHATLAS_TOKEN=your-jwt-token\n" +
      "Get your token from the SearchAtlas app: DevTools Console → localStorage.getItem('token')"
    );
  }

  return { apiUrl: apiUrl.replace(/\/+$/, ""), apiKey, token };
}
