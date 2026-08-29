# Agent Rules & Windows Execution Guidelines

## 1. Operating System Context

- **OS:** Windows 11
- **Shell:** PowerShell 7 / Windows CMD
- **Workspace:** `d:\03_Data\Mine\Kuliah\Tugas\Semester 4\Manajemen Proyek\KMIPN\siagakita`

## 2. Command Execution Rules (ANTI-LOOPING ERROR)

1. **Never use single quotes `'...'` in shell commands** — Windows `cmd.exe` will fail with syntax errors. Always use escaped double quotes `\"...\"`.
2. **Do not run complex one-liner bash scripts** with `python -c` or `node -e` containing multiline quotes. If a script is needed, write a temporary `.mjs` or `.ps1` file.
3. **If a search / grep command fails once, STOP immediately.** Do not retry variations of the same regex pattern. Inspect the directory tree or read the target file directly.
4. **Prefer native npm/pnpm commands** (e.g. `pnpm build`, `npx tsc --noEmit`, `pnpm lint`).
5. **Keep actions targeted and concise** — Avoid repo-wide scraping when specific component files are known.
