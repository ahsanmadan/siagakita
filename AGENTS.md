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
