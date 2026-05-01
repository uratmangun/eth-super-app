---
description: List, configure, authenticate, call, and inspect MCP servers/tools with mcporter over HTTP or stdio.
homepage: http://mcporter.dev
metadata:
    github-path: skills/mcporter
    github-ref: refs/tags/v2026.4.29
    github-repo: https://github.com/steipete/clawdis
    github-tree-sha: 836036d0ee3b35be50a55a0b2ba359cd62aa2ba2
    openclaw:
        emoji: "\U0001F4E6"
        install:
            - bins:
                - mcporter
              id: node
              kind: node
              label: Install mcporter (node)
              package: mcporter
        requires:
            bins:
                - mcporter
name: mcporter
---
# mcporter

Use `mcporter` to work with MCP servers directly.

Quick start

- `mcporter list`
- `mcporter list <server> --schema`
- `mcporter call <server.tool> key=value`

Call tools

- Selector: `mcporter call linear.list_issues team=ENG limit:5`
- Function syntax: `mcporter call "linear.create_issue(title: \"Bug\")"`
- Full URL: `mcporter call https://api.example.com/mcp.fetch url:https://example.com`
- Stdio: `mcporter call --stdio "bun run ./server.ts" scrape url=https://example.com`
- JSON payload: `mcporter call <server.tool> --args '{"limit":5}'`

Auth + config

- OAuth: `mcporter auth <server | url> [--reset]`
- Config: `mcporter config list|get|add|remove|import|login|logout`

Daemon

- `mcporter daemon start|status|stop|restart`

Codegen

- CLI: `mcporter generate-cli --server <name>` or `--command <url>`
- Inspect: `mcporter inspect-cli <path> [--json]`
- TS: `mcporter emit-ts <server> --mode client|types`

Notes

- Config default: `./config/mcporter.json` (override with `--config`).
- Prefer `--output json` for machine-readable results.
