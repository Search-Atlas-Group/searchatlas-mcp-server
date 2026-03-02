# SearchAtlas MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that connects any MCP-compatible client to the SearchAtlas AI Agent platform — giving Claude Desktop, Cursor, Zed, Claude Code, and other AI tools access to 10 specialized SEO/marketing agents, project management, playbook automation, and more.

## Quick Start

### 1. Install

```bash
npm install -g searchatlas-mcp-server
```

### 2. Set up your token (one-time)

```bash
echo "SEARCHATLAS_TOKEN=your-jwt-token" > ~/.searchatlasrc
```

> **How to get your token:** Log into [searchatlas.com](https://searchatlas.com), open browser DevTools (F12) → Console → run `localStorage.getItem('token')` → copy the result.

### 3. Run

```bash
searchatlas-mcp-server
```

That's it. The server reads your token from `~/.searchatlasrc` automatically.

### Or run without installing

```bash
npx searchatlas-mcp-server
```

## Client Setup

### Cursor

Create `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "searchatlas": {
      "command": "npx",
      "args": ["-y", "searchatlas-mcp-server"]
    }
  }
}
```

> If you set up `~/.searchatlasrc`, no `env` block is needed. Otherwise add `"env": { "SEARCHATLAS_TOKEN": "your-jwt-token" }`.

### Claude Code

```bash
claude mcp add searchatlas -- npx -y searchatlas-mcp-server
```

> Token is read from `~/.searchatlasrc` automatically.

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "searchatlas": {
      "command": "npx",
      "args": ["-y", "searchatlas-mcp-server"]
    }
  }
}
```

### Zed

Add to Zed settings (`settings.json`):

```json
{
  "context_servers": {
    "searchatlas": {
      "command": {
        "path": "npx",
        "args": ["-y", "searchatlas-mcp-server"]
      }
    }
  }
}
```

### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "searchatlas": {
      "command": "npx",
      "args": ["-y", "searchatlas-mcp-server"]
    }
  }
}
```

## Configuration

### Option A: `~/.searchatlasrc` file (recommended)

Create once, works everywhere:

```bash
echo "SEARCHATLAS_TOKEN=your-jwt-token" > ~/.searchatlasrc
```

### Option B: Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SEARCHATLAS_TOKEN` | Yes (recommended) | JWT token from SearchAtlas app |
| `SEARCHATLAS_API_KEY` | Alternative | API key (sent as `X-API-Key` header) |
| `SEARCHATLAS_API_URL` | No | API base URL (default: `https://mcp.searchatlas.com`) |

### Option C: Inline in client config

Add an `env` block to any client config above:

```json
"env": {
  "SEARCHATLAS_TOKEN": "your-jwt-token"
}
```

## Tools

### Agent Tools (10)

Each agent tool accepts a `message` (required), plus optional `project_id`, `playbook_id`, and `plan_mode` parameters.

| Tool | Agent | Description |
|------|-------|-------------|
| `searchatlas_orchestrator` | Orchestrator | Multi-agent coordinator — routes queries to the best specialist |
| `searchatlas_otto_seo` | OTTO SEO | On-page SEO automation — technical fixes, schema, optimizations |
| `searchatlas_ppc` | PPC | Google Ads management — campaigns, bids, performance analysis |
| `searchatlas_content` | Content Genius | AI content generation — blogs, landing pages, optimized copy |
| `searchatlas_site_explorer` | Site Explorer | Site audit — crawl data, backlinks, competitive intelligence |
| `searchatlas_gbp` | GBP | Google Business Profile — listings, reviews, local SEO |
| `searchatlas_authority_building` | Authority | Link building and digital PR — outreach and authority signals |
| `searchatlas_llm_visibility` | LLM Visibility | Tracks how AI models reference your brand and competitors |
| `searchatlas_keywords` | Keywords | Keyword research — volume, difficulty, SERP analysis, clustering |
| `searchatlas_website_studio` | Website Studio | Website builder — pages, layouts, and site structure |

### Management Tools (6)

| Tool | Description |
|------|-------------|
| `searchatlas_list_projects` | List projects with pagination and search |
| `searchatlas_create_project` | Create a new project by domain |
| `searchatlas_list_conversations` | List chat sessions, filtered by agent |
| `searchatlas_list_artifacts` | List generated artifacts (code, content, reports) |
| `searchatlas_list_playbooks` | List automation playbooks |
| `searchatlas_run_playbook` | Execute a playbook on a project |

## Usage Examples

Once connected, just talk to your AI client naturally:

- *"What are the top SEO issues for my site?"* → calls `searchatlas_orchestrator`
- *"Run a technical SEO audit on project 42"* → calls `searchatlas_otto_seo`
- *"Write a blog post about technical SEO best practices"* → calls `searchatlas_content`
- *"Find long-tail keywords for project management software"* → calls `searchatlas_keywords`
- *"List my projects"* → calls `searchatlas_list_projects`
- *"Show available playbooks and run one"* → calls `searchatlas_list_playbooks` then `searchatlas_run_playbook`

The AI client picks the right tool automatically.

## Development

### Setup

```bash
git clone https://github.com/bennethuzochukwu-cloud/searchatlas-mcp-server.git
cd searchatlas-mcp-server
npm install
npm run build
```

### Test with MCP Inspector

```bash
npx "@modelcontextprotocol/inspector" npx searchatlas-mcp-server
```

> Token is read from `~/.searchatlasrc`. Or pass inline: `SEARCHATLAS_TOKEN=xxx npx "@modelcontextprotocol/inspector" npx searchatlas-mcp-server`

### Project Structure

```
searchatlas-mcp-server/
├── src/
│   ├── index.ts              # Entry point — MCP server + stdio transport
│   ├── config.ts             # Config loader (env vars + ~/.searchatlasrc)
│   ├── tools/
│   │   ├── register-all.ts   # Tool registration orchestrator
│   │   ├── agent-tools.ts    # 10 agent chat tools (factory-generated)
│   │   ├── project-tools.ts  # Project list/create
│   │   ├── conversation-tools.ts  # Chat session listing
│   │   ├── artifact-tools.ts # Generated artifact listing
│   │   └── playbook-tools.ts # Playbook list/execute
│   ├── types/
│   │   ├── agents.ts         # Agent endpoint registry
│   │   └── api.ts            # API response types
│   └── utils/
│       ├── api-client.ts     # HTTP + SSE streaming client
│       ├── auth.ts           # Auth header builder
│       ├── errors.ts         # Error types + formatter
│       └── session.ts        # Session/user ID helpers
├── dist/                     # Compiled output (git-ignored)
├── server.json               # MCP registry metadata
├── Dockerfile                # Multi-stage Docker build
├── package.json
├── tsconfig.json
└── LICENSE
```

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `Missing credentials` | No token found | Run `echo "SEARCHATLAS_TOKEN=xxx" > ~/.searchatlasrc` |
| `fetch failed` | API URL unreachable | Check network connection |
| `[401] Authentication failed` | Token expired | Get a fresh token from the SearchAtlas app |
| `[400] session_id required` | Outdated build | Run `npm install -g searchatlas-mcp-server` to update |

## License

MIT
