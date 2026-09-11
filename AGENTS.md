# Agent Rules & Windows Execution Guidelines

## 0. Autonomous Role & Direct Execution
- You are an autonomous coding agent with full workspace access.
- You must directly inspect files, write code changes, and execute terminal commands using your tools rather than claiming you lack filesystem access.
- Never state that you only have web search or image tools. Always execute code modifications directly.

## 1. Operating System Context

- **OS:** Windows 11
- **Shell:** Windows PowerShell 5.1 / Windows CMD
- **Workspace:** `d:\03_Data\Mine\Kuliah\Tugas\Semester 4\Manajemen Proyek\KMIPN\siagakita`

## 2. Command Execution Rules (ANTI-LOOPING ERROR)

1. **Never use single quotes `'...'` in shell commands** — Windows `cmd.exe` will fail with syntax errors. Always use escaped double quotes `\"...\"`.
2. **Do not run complex one-liner bash scripts** with `python -c` or `node -e` containing multiline quotes. If a script is needed, write a temporary `.mjs` or `.ps1` file.
3. **If a search / grep command fails once, STOP immediately.** Do not retry variations of the same regex pattern. Inspect the directory tree or read the target file directly.
4. **Prefer native npm/pnpm commands** (e.g. `pnpm build`, `npx tsc --noEmit`, `pnpm lint`).
5. **Keep actions targeted and concise** — Avoid repo-wide scraping when specific component files are known.

## 3. Token Economy & Anti-Context-Bloat Rules (CRITICAL)

1. **Verification Hierarchy**: Default strictly to `npx tsc --noEmit` and `pnpm build`. Do NOT launch headless browsers or run Playwright scripts for routine coding tasks.
2. **NO Autonomous Screenshots**: NEVER capture or view full-page screenshots in context unless the user explicitly asks (`ambil screenshot` / `cek visual browser`). Multimodal vision consumes thousands of tokens per image.
3. **No Giant Log Dumps**: Never read logs with `Tail > 30`. Always filter or inspect targeted error messages.
4. **Fail Fast on Auth/Clock Skew**: If dev login, token, or auth fails once, STOP and report immediately. Never spin 5+ trial-and-error scripts in a loop.
5. **Clean Temporary Files**: Always clean up any `tmp-*.mjs` or probe scripts immediately upon finishing.

---

# 🔒 LOCKED VIBE CODING STACK — PERMANENT ENFORCEMENT

> All skills below are **always active**. No confirmation needed. No re-prompting.

## 4. Core Behavior & Formatting (Caveman Ultra + Antislop Base)

- **Mode**: Caveman Ultra + Antislop Base
- Output must be ultra-short. Zero filler, greetings, pleasantries, or explanations. Go straight to code/solution.
- Skills locked:
  - `$caveman` → enforce `ultra` mode
  - `$antislop`
  - `$antislop-human`
  - `$antislop-copywriting`

## 5. Code Generation & Pruning (Ponytail + Antislop Code)

- **Mode**: Ponytail Strict + Antislop Code
- Maximize code pruning. Eliminate dead code, redundant boilerplate, over-engineering. Rely 100% on native/stdlib platform features.
- Skills locked:
  - `@Ponytail` → lock strict execution
  - `$antislop-code`

## 6. Frontend & Mobile UI (Frontend Design + Antislop UI/Mobile Layout)

- **Mode**: Modern Responsive UI Guard
- Enforce pixel-perfect design system tokens, consistent spacing, mobile-first, lightweight layouts.
- Skills locked:
  - `$frontend-design`
  - `$antislop-ui`
  - `$antislop-layoutmobile`

## 7. Architecture & Workflow (Improve Architecture + To Tickets)

- **Mode**: Codebase Integration & Task Segmentation
- Align all output with existing repository patterns. Split massive features into modular micro-tickets automatically.
- Skills locked:
  - `$improve-codebase-architecture`
  - `$to-tickets`
