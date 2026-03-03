/**
 * Interactive login flow — opens the browser, prompts for token, validates it,
 * saves to ~/.searchatlasrc, and displays config snippets for MCP clients.
 */

import { createInterface } from 'node:readline/promises';
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { exec } from 'node:child_process';
import { validateToken } from './utils/token.js';

const RC_PATH = join(homedir(), '.searchatlasrc');
const LOGIN_URL = 'https://dashboard.searchatlas.com/login';

function openBrowser(url: string): void {
  const cmd =
    process.platform === 'darwin'
      ? `open "${url}"`
      : process.platform === 'win32'
        ? `start "${url}"`
        : `xdg-open "${url}"`;

  exec(cmd, (err) => {
    if (err) {
      console.log(
        `\nCould not open browser automatically. Please visit:\n  ${url}\n`,
      );
    }
  });
}

function saveToken(token: string): void {
  const lines: string[] = [];

  if (existsSync(RC_PATH)) {
    const existing = readFileSync(RC_PATH, 'utf-8');
    for (const line of existing.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('SEARCHATLAS_TOKEN=')) continue;
      if (trimmed) lines.push(trimmed);
    }
  }

  lines.push(`SEARCHATLAS_TOKEN=${token}`);
  writeFileSync(RC_PATH, lines.join('\n') + '\n', { mode: 0o600 });
}

function printConfigSnippets(token: string): void {
  console.log('\n  ────────────────────────────────────────────');
  console.log('  Your token (copy this):\n');
  console.log(`  ${token}`);
  console.log('\n  ────────────────────────────────────────────');

  console.log('\n  Paste it into your MCP client settings:\n');

  console.log('  ── Claude Code ──────────────────────────────\n');
  console.log(
    `  claude mcp add searchatlas -e SEARCHATLAS_TOKEN=${token} -- npx -y searchatlas-mcp-server\n`,
  );

  console.log('  ── Claude Desktop ───────────────────────────\n');
  console.log(
    `  ${JSON.stringify(
      {
        mcpServers: {
          searchatlas: {
            command: 'npx',
            args: ['-y', 'searchatlas-mcp-server'],
            env: { SEARCHATLAS_TOKEN: token },
          },
        },
      },
      null,
      2,
    )
      .split('\n')
      .map((l) => '  ' + l)
      .join('\n')}\n`,
  );

  console.log('  ── Cursor (.cursor/mcp.json) ────────────────\n');
  console.log(
    `  ${JSON.stringify(
      {
        mcpServers: {
          searchatlas: {
            command: 'npx',
            args: ['-y', 'searchatlas-mcp-server'],
            env: { SEARCHATLAS_TOKEN: token },
          },
        },
      },
      null,
      2,
    )
      .split('\n')
      .map((l) => '  ' + l)
      .join('\n')}\n`,
  );

  console.log('  Done! The MCP server will use your token automatically.\n');
}

export async function runLogin(): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  console.log('\n  SearchAtlas MCP Server — Login\n');
  console.log('  Opening SearchAtlas in your browser...\n');
  openBrowser(LOGIN_URL);

  console.log('  After logging in, grab your token:');
  console.log('    1. Open DevTools (F12) → Console');
  console.log('    2. Run: localStorage.getItem("token")');
  console.log('    3. Copy the result (with or without quotes)\n');

  const raw = (await rl.question('  Paste your token here: ')).trim();
  rl.close();

  if (!raw) {
    console.error('\n  No token provided. Aborting.\n');
    process.exit(1);
  }

  // Validate before saving — catches quotes, expired tokens, and garbage
  const result = validateToken(raw);

  if (!result.valid) {
    console.error(`\n  Invalid token: ${result.error}`);
    if (result.expiresAt) {
      console.error(`  Log in again at ${LOGIN_URL} to get a fresh token.`);
    }
    console.error('');
    process.exit(1);
  }

  // Warn if token expires within 24 hours
  if (result.expiresAt) {
    const hoursLeft = (result.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursLeft < 24) {
      console.log(
        `\n  Warning: Token expires in ${Math.round(hoursLeft)} hours ` +
        `(${result.expiresAt.toLocaleDateString()} ${result.expiresAt.toLocaleTimeString()}).`,
      );
    }
  }

  // Save the sanitized token (quotes already stripped)
  saveToken(result.token!);
  console.log(`\n  Token saved to ${RC_PATH}`);

  printConfigSnippets(result.token!);
}
