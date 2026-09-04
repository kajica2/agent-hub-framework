# Watchdog — one-step-at-a-time relay agent

The watchdog sits at the end of the rope. It does NOT poll, does NOT scan
everything, does NOT auto-loop. It wakes on three triggers:

1. **Done** — a delegated task completes (PR merged / push to main)
2. **Stuck** — an agent is blocked and needs a human decision
3. **Heartbeat** — every 8 hours, just to say "alive"

When it wakes, it sends ONE message to Kai (Telegram, falls back to iMessage
on macOS). Then it idles.

## Configure

Edit `~/.hermes/config.yaml`:

```yaml
telegram:
  bot_token: <token from @BotFather>
  chat_id:   <your numeric chat id>
```

Or set env vars:

```bash
export TELEGRAM_BOT_TOKEN="..."
export TELEGRAM_CHAT_ID="..."
```

For iMessage fallback (macOS), Messages.app must be signed in.

## Use

From any agent:

```bash
node watchdog/watchdog.mjs \
  --mode done \
  --step 3 \
  --summary "Built hub instance from framework template" \
  --artifacts "https://kajica2.github.io/" \
  --handoff "Click around. Tell me what to tweak next."
```

When blocked:

```bash
node watchdog/watchdog.mjs \
  --mode stuck \
  --step 5 \
  --reason "Need Vercel token to wire daily pipeline cron" \
  --tried "Read Vercel env, no token present" \
  --need "VERCEL_TOKEN + cron auth, paste into ~/.hermes/config.yaml" \
  --default "Skip Step 5 until token available, move to Step 6"
```

## Run modes

- `--mode done` — green check, summary, next step. Idles after.
- `--mode stuck` — warning, reason, what was tried, what's needed, suggested fallback.
- `--mode heartbeat` — heart emoji, summary, "alive, no action needed".

## GitHub Actions

`.github/workflows/watchdog.yml` is wired to:
- Push to main → heartbeat/done
- PR closed (merged) → done
- Every 8 hours → heartbeat
- Manual trigger → configurable

The workflow calls `node watchdog/watchdog.mjs` with args derived from the
GitHub event.
