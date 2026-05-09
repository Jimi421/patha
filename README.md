# The Path — OSCP Field Guide

> *Veda means knowledge. This is the knowledge of enumeration.*

An interactive decision-tree methodology for OSCP exam day, lab work, and offensive-security practice generally. **196 nodes** spanning recon to reporting, with mindset content for when the methodology matters more than the technique.

Live at [patha.pages.dev](https://patha.pages.dev).

## What it is

- **Exam day** — Start at `start`, follow the tree. Every node makes one decision for you. Designed for the moments under pressure when freelance thinking fails.
- **Labs & CTFs** — A 22-option Jump menu reaches ~80% of the graph in two clicks. Skip straight to the technique you need.
- **Lessons from the lab** — Post-engagement retrospectives from real boxes (Exghost, Vault, Shenzi). Full chains with timing, decisions that mattered, and the reusable patterns extracted from them.
- **Documentation** — Built-in MITRE ATT&CK-structured note templates, plus one-click Obsidian export of the current node as Markdown with proof/evidence sections pre-stubbed.
- **Mindset** — Triage, rabbit-hole detection, the Pomodoro reset, and pre-exam checklists. Arjuna on Kurukshetra is in here for a reason.
- **Pivot calculator** — Standalone wizard at `/pivot` that walks you through choosing a pivoting method (SSH local/dynamic/remote, sshuttle, chisel, ligolo, socat, plink, netsh) based on network constraints, then generates the exact commands with your variables substituted in.

## Coverage

| Domain | Nodes |
|---|---|
| Web attacks | 36 |
| Windows privesc | 23 |
| Recon & enumeration | 23 |
| Active Directory | 20 |
| Linux privesc | 14 |
| Shells & payloads | 12 |
| Reporting & documentation | 12 |
| Pivoting & tunnels | 11 |
| Jump menus | 9 |
| Mindset & retrospectives | 9 |
| SMB | 7 |
| Credentials | 5 |
| Output analysis | 5 |
| Post-exploitation | 3 |
| Exploit dev | 2 |
| SSH | 2 |
| Host discovery | 2 |
| FTP | 1 |

SQL injection has its own 9-node sub-flow under Web (test → confirm → union/error/blind/time/sqlmap → shell → WAF bypass).

## Keyboard

- `1`–`9` — pick a choice
- `Backspace` / `←` — back
- `R` — reset to start
- `?` / `A` — about

## Local development

```bash
npm install
npm run dev
```

The dev server logs dead links, undefined phases, and orphan nodes on every reload — see `src/utils/loadNodes.js`.

## Deploy

Connected to Cloudflare Pages. Build command: `npm run build`, output: `dist`. SPA fallback and security headers in `public/_redirects` and `public/_headers`.

## Adding a node

1. Create `src/data/nodes/<id>.json`. Schema: `id`, `phase` (must match `src/data/phases.json`), `title`, `body`, optional `cmd`, optional `warn`, `choices` (array of `{ label, next }` or `{ label, href }`).
2. Link it from at least one existing node — orphans get flagged in dev.
3. Reload. The dev validator confirms the wire-up.

No build step needed for content. `import.meta.glob` picks up the new file automatically.

## Background

Built by a practitioner studying Vedic tradition and comparative mythology alongside offensive security. The methodology, the naming, and the inner path are the same project — knowledge as practice, not just reference.

*Not affiliated with OffSec.*
