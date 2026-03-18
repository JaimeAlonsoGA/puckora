# Remote Development

This repo now supports a split workflow:

- **Mac executor** = always-on background job runner and local vector database host
- **Laptop / Linux workstation** = daily development machine

## Current Mac executor state

Verified on this Mac:

- local vector Postgres is running on `127.0.0.1:5432`
- Fly proxy is running on `127.0.0.1:15432`
- Tailscale userspace daemon is running persistently via launchd
- tailnet TCP forward is published on `6543`
- current tailnet DNS name is `juno.tail938d67.ts.net`
- current tailnet vector endpoint is `postgresql://100.75.76.97:6543/puckora_vectors`

The local vector database is **not** a single sqlite-like file. It is a normal Postgres database named `puckora_vectors` stored inside the Postgres data directory.

Current local facts:

- Postgres data directory: `/opt/homebrew/var/postgresql@17`
- Postgres version: `17.9`
- Vector DB name: `puckora_vectors`
- Main table: `public.vector_documents`

## Stop / restart safety

The two important long-running jobs are safe to stop and restart:

- `scrape:amazon:resume` is restart-safe because it uses checkpoint + cache state
- `vectors:backfill` is restart-safe because it persists sync cursor state and pending OpenAI batch state

That means you can stop them and relaunch them inside `tmux` without losing overall progress.

What you may lose when stopping:

- at most a small amount of in-flight work since the last flush/checkpoint
- not the whole run

For this reason, terminal-managed `tmux` sessions are preferred over ad-hoc GUI terminals.

## Mac-only commands

Run these on the Mac itself, not on the laptop clone:

```bash
npm run remote:up
npm run remote:status
npm run remote:job -- start <name> -- <command...>
npm run remote:job -- status
npm run remote:job -- logs <name>
npm run remote:job -- stop <name>
npm run db:proxy
npm --prefix apps/scraper run scrape:amazon:resume
npm --prefix packages/vectors run backfill
npm --prefix packages/vectors run batch
npm --prefix packages/vectors run status
```

These commands manage the Mac's local Postgres, Fly proxy, Tailscale tunnel, and long-running executor jobs.

`runs/remote-jobs/` is a root-level runtime folder created by `npm run remote:job -- ...`.

- it stores PID files, captured command lines, and log files for detached jobs
- it is disposable runtime state, not source code
- it can be deleted when no tracked job still needs its PID or log file
- it is now ignored by git and should never be committed

## What each remote script does

`npm run remote:up`

- installs or refreshes the persistent userspace Tailscale launch agent
- ensures local Postgres 17 is available
- ensures the Fly proxy is available on `127.0.0.1:15432`
- republishes the vector Postgres to the tailnet on port `6543`

`npm run remote:status`

- checks local Postgres port `5432`
- checks Fly proxy port `15432`
- prints Tailscale status and the published TCP forward
- prints vectors sync/batch status
- prints tmux windows
- prints live scraper/backfill processes
- prints tracked background jobs from `remote:job`

`npm run remote:job -- ...`

- starts and tracks detached background jobs with PID files and logs under `runs/remote-jobs/`
- useful for generic detached commands
- not as good as `tmux` when you want live terminal visibility

`npm run remote:tmux -- ...`

- creates and manages a persistent tmux session on the Mac
- best choice for scraper and vector jobs you want to inspect interactively over SSH
- includes windows for `status`, `scraper`, `vectors`, and `jobs`

## Client-machine commands

Run these on the laptop or Linux clone:

```bash
git pull
npm install
npm run env:sync
npm run dev
```

Client-machine notes:

- if the laptop or Linux machine runs the web app and needs Fly-backed catalog access, either run a **local** Fly proxy on that machine with `npm run db:proxy`, or unset `DATABASE_PROXY_URL` locally so the app falls back to direct `DATABASE_URL`
- if the laptop or Linux machine needs vector reads against the Mac-hosted vector DB, set:

```bash
VECTOR_DATABASE_URL=postgresql://100.75.76.97:6543/puckora_vectors
```

Do **not** run the Mac executor scripts on the laptop expecting them to control the Mac remotely. To inspect or control the Mac, SSH into it first.

The laptop or Linux machine can run normal local development commands. The Mac-only scripts should be run only after SSHing into the Mac, or directly on the Mac console.

## SSH bridge

Use **Tailscale SSH** as the primary bridge. It is already enabled on the Mac's Tailscale node.

What SSH gives you:

- remote shell access to the Mac
- ability to start/stop scraper and vector jobs
- access to `psql`, local Postgres, Fly proxy health checks, and log files
- ability to run `npm run remote:status`
- ability to use `tmux` for persistent terminal sessions

What SSH does **not** give you automatically:

- access to existing Terminal.app windows already open on the Mac desktop

If a job was started in a local GUI terminal, SSH cannot attach to that same terminal session. For that, you would need screen sharing. For future jobs, use `tmux` on the Mac.

If `tailscale ssh codex@juno.tail938d67.ts.net` appears blank, test non-interactively first:

```bash
tailscale ssh codex@juno.tail938d67.ts.net 'hostname && whoami && pwd'
```

If that works, SSH itself is fine and the issue is only interactive shell rendering or startup behavior.

If it still hangs or stays blank, verify the Mac has reloaded the userspace Tailscale daemon with SSH host-key support:

```bash
cd /Users/codex/code/Puckora
npm run remote:install-tailscale
npm run remote:up
```

This repo uses a userspace Tailscale daemon with a custom socket and state directory. The SSH issue was caused by the daemon missing a persistent state directory for SSH host keys.

## tmux workflow on the Mac

This repo now includes a helper for terminal-oriented remote operation:

```bash
npm run remote:tmux -- up
npm run remote:tmux -- run-remote-status
npm run remote:tmux -- run-scraper
npm run remote:tmux -- run-vectors-backfill
npm run remote:tmux -- attach
```

That creates a persistent tmux session with separate windows for:

- `status`
- `scraper`
- `vectors`
- `jobs`

Recommended usage for future long-running jobs:

```bash
npm run remote:tmux -- up
npm run remote:tmux -- run-remote-status
npm run remote:tmux -- run-scraper
npm run remote:tmux -- run-vectors-backfill
npm run remote:tmux -- attach
```

## Exact client-machine setup steps

Starting from a fresh laptop or Linux session:

1. Install Tailscale on the laptop or Linux machine.
2. Sign into the same tailnet/account used by the Mac.
3. Verify the Mac executor is reachable on the same tailnet:

```bash
tailscale status
tailscale ping juno.tail938d67.ts.net
```

4. SSH into the Mac over Tailscale:

```bash
tailscale ssh codex@juno.tail938d67.ts.net
```

If the interactive SSH session appears blank, use this test instead first:

```bash
tailscale ssh codex@juno.tail938d67.ts.net 'hostname && whoami && pwd'
```

If `juno.tail938d67.ts.net` does not resolve on the laptop or Linux machine, that machine is logged into the wrong Tailscale account or a different tailnet. Fix that first before troubleshooting anything else.

5. On the Mac, verify executor health when needed:

```bash
cd /Users/codex/code/Puckora
npm run remote:status
```

Useful DB smoke tests on the Mac:

```bash
psql 'postgresql://127.0.0.1:5432/puckora_vectors' -Atqc "select current_database(), current_user;"
psql 'postgresql://127.0.0.1:5432/puckora_vectors' -Atqc "select count(*) from public.vector_documents;"
```

6. On the laptop or Linux machine, clone or update the repo:

```bash
git pull
npm install
```

7. On the laptop or Linux machine, set the vector DB to the Mac-hosted tailnet endpoint in your root `.env` or shell:

```bash
VECTOR_DATABASE_URL=postgresql://100.75.76.97:6543/puckora_vectors
```

8. On the laptop or Linux machine, decide how Fly catalog access should work:

- preferred for local dev: run a laptop-local Fly proxy with `npm run db:proxy`
- alternative: remove or override `DATABASE_PROXY_URL` locally so code uses direct `DATABASE_URL`

9. Sync env files on the laptop or Linux machine:

```bash
npm run env:sync
```

10. Run local web dev on the laptop or Linux machine.

## Current recommended job model

Right now:

- the scraper and vectors backfill have been migrated into `tmux`
- future long-running jobs should start in `tmux`, not in GUI terminals
- use `npm run remote:status` to confirm they are still alive

## `pmset autorestart`

`sudo pmset -a autorestart 1` tells the Mac to boot back up automatically after a power loss.

That helps because this machine is now acting as a headless executor. It does **not** guarantee jobs themselves restart automatically, but it reduces downtime after a power interruption.

## Existing jobs right now

At the moment, the Amazon scraper and vector backfill are already running on the Mac inside the `puckora-executor` tmux session. That means:

- they are alive
- you can verify them with `ps aux` or `npm run remote:status`
- you can inspect them over SSH with `npm run remote:tmux -- attach`

For future long-running jobs, prefer Tailscale SSH + tmux on the Mac.