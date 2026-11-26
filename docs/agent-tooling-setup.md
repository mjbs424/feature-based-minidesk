# First-time setup: app, commit checks, and agent tools

This is the single installation guide for a new MiniDesk checkout. Once setup is complete, use [development.md](development.md) for commands and checks and [agent-tooling.md](agent-tooling.md) only for agent tools relevant to a task. Do not repeat these installation steps during ordinary work.

## Application

1. Install [Git](https://git-scm.com/downloads) and clone this repository; check `git --version`.
2. Install the [global Vite+ `vp` CLI](https://viteplus.dev/guide/global-cli). On Windows, run `irm https://vite.plus/ps1 | iex` in PowerShell or use the `vp-setup.exe` linked in that guide. On macOS or Linux, run `curl -fsSL https://vite.plus | bash`. Open a new terminal and check `vp help`.
3. This project uses Node.js 24 and pins pnpm 12.21.0 in `package.json`. Install [Node.js 24](https://nodejs.org/en/download) or select it through [Vite+ environment management](https://viteplus.dev/guide/env). From the repository root, run `vp env current` and confirm Node.js 24; Vite+ resolves the pinned pnpm version.
4. From the repository root, run `vp install --frozen-lockfile`, then `vp dev` to start the app.

## MiniDesk database environment

The frontend can start without database credentials. To run the demo API locally, create these two separate, Git-ignored files in the repository root. Use connection strings from the matching Neon branch; never commit or paste the values into chat.

| Local file           | Neon branch               | Required entries                                                | Used for                               |
| -------------------- | ------------------------- | --------------------------------------------------------------- | -------------------------------------- |
| `.env.local`         | Primary                   | `DATABASE_URL` = pooled URL; `DATABASE_DIRECT_URL` = direct URL | Local API and primary-branch migration |
| `.env.preview.local` | Separate `preview` branch | `DATABASE_DIRECT_URL` = direct URL only                         | Preview-branch migration               |

Example file shapes (replace the placeholders with your own Neon connection strings):

```dotenv
# .env.local
DATABASE_URL=postgresql://...primary-pooled...
DATABASE_DIRECT_URL=postgresql://...primary-direct...
```

```dotenv
# .env.preview.local
DATABASE_DIRECT_URL=postgresql://...preview-direct...
```

Run `pnpm run db:migrate` for the primary branch. To migrate the Preview branch in PowerShell, first run `Remove-Item Env:DATABASE_DIRECT_URL -ErrorAction SilentlyContinue`, then `node --env-file=.env.preview.local scripts/migrate-minidesk.mjs`; Node gives an inherited shell variable precedence over the file. Keep `.env.local` unchanged when migrating Preview. For hosted deployments, set only the server-side `DATABASE_URL`: the primary **pooled** URL in the Production Vercel project and the Preview branch's **pooled** URL in the Preview Vercel project. The direct URL is not needed in Vercel. See [backend operation](backend.md) for API startup, reset, and deployment details.

## Local commit tools

1. Install [Gitleaks](https://github.com/gitleaks/gitleaks/releases) by extracting the binary for your platform to a directory on `PATH`. Open a new terminal and check `gitleaks version`.
2. Install [uv](https://docs.astral.sh/uv/getting-started/installation/); on Windows, run `winget install --id=astral-sh.uv -e`. Open a new terminal and check `uvx --version`.
3. Install [Semgrep](https://github.com/semgrep/semgrep#option-2-getting-started-from-the-cli) with `uv tool install semgrep`. On an Intel Mac, use `uv tool install semgrep==1.182.1` instead; newer releases do not ship an Intel macOS scan engine. Check `semgrep --version`. If the command is not found, follow uv's `PATH` instructions and reopen the terminal.

Gitleaks and Semgrep must be on `PATH` for local commits. See [development.md](development.md#check-coverage) for the hook's checks and failure behavior.

## Agent tools

The Anthropic `frontend-design` skill is included in `.agents/skills/`; no additional package is needed. Context7 uses the hosted endpoint in [`.codex/config.toml`](../.codex/config.toml), needs network access, and does not require a local installation or stored API key.

For Serena, run `uv python install 3.13` and `uvx -p 3.13 --from serena-agent==1.5.3 serena project health-check` from the repository root. `uvx` fetches the pinned package and its dependencies as needed, so do not install Serena globally. The command checks this TypeScript project.

Install and sign in to the [Codex desktop app](https://learn.chatgpt.com/docs/app) or [Codex CLI](https://learn.chatgpt.com/docs/codex/cli). Open **this repository root** as a trusted project and start a new chat. Trusting the parent directory may not trust this repository. In the CLI, `codex mcp list` from this root should show `context7` and `serena`; if not, accept Codex's trust prompt or add `[projects.'<absolute-repository-path>']` with `trust_level = "trusted"` to your personal `~/.codex/config.toml`. Restart Codex if `uvx` was just added to `PATH`.

In the new chat, ask for an actual Context7 `resolve_library_id` and `query_docs` call for `@tanstack/react-query` and a Serena `find_symbol` call for `ToDoPage`. Require one concrete result from each. A configured-server list alone does not prove a live connection.

## If an agent tool does not load

Check the chat's starting directory and project trust first. Existing chats do not acquire newly loaded MCPs automatically; start a new chat from the repository root. For Serena, check `uvx --version` in the environment that actually runs Codex and repeat the health check. On Windows, if the health check reaches its final message but fails to print a Unicode symbol, set `PYTHONUTF8=1` for that shell and rerun it. A restricted command runner may hide an installed `uvx`; `Get-Command uvx` there is not a machine-level verdict. For Context7, test an MCP call from Codex before drawing conclusions from a direct network probe, which may have different permissions. Report the exact check and failure rather than claiming a tool was used or is absent from the machine.
