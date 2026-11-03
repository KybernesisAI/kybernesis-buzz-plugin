# Kybernesis for Buzz

A Buzz desktop plugin that sets up a Kybernesis agent: a Buzz Claude agent with long-term memory, running on the person's own Claude plan. Its server is buzz.kybernesis.ai (`KybernesisAI/kybernesis-buzz`).

## Install

Settings → Plugins → Manage plugins → Add, enter `https://github.com/KybernesisAI/kybernesis-buzz-plugin`, pick **Kybernesis**, Install. The page appears in the sidebar as **Kybernesis**.

The agent runs on Claude, so Claude must be on in Buzz: Settings → Agent setup → Claude → Install, then Sign in. The page says so when it isn't.

## The page

Before the first agent: a guided setup (Claude check, name, role, what it helps with, Create). After that: the person's agents as cards (running in Buzz, memory on), a small New agent button in the corner, and Account, which opens buzz.kybernesis.ai already signed in (a one-time link). Its sidebar icon is the Kybernesis K as a solid silhouette (a data-URL `icon` on the page, Graphite, Paper in dark mode); `release/icon.png` and `release/README.md` are what Buzz shows on the plugin's own page.

Each time the page opens it signs in with the Buzz key (one replaceable kind 30315 event, never shown), then syncs with the account: agents the site doesn't know are registered, edits made on the site (name, role, focus, picture) are written into the agent's folder and its Buzz profile, and every folder gets the current memory key.

## What Create does

1. Signs in to buzz.kybernesis.ai with the person's Buzz identity: the server issues a challenge bound to a throwaway browser key, the Buzz key signs it as a kind 30315 event (`d=kybernesis-signin`, never shown as a status), and the throwaway key signs the event id. No email, no password.
2. Gets the person's memory key (one memory per Buzz identity, the same key every time).
3. Writes the agent's folder under `~/Kybernesis/agents/<name>`: `CLAUDE.md`, `.mcp.json` (memory server), `.claude/settings.json`, and the recall, remember and notes skills. The agent's role and focus go into its CLAUDE.md.
4. Checks the memory answers with that key.
5. Creates the Buzz Claude agent working in that folder, with the robot picture, and registers it with the account.

`~/Kybernesis/agents.json` lists the agents made on this Mac. The page shows each one with whether its memory is working.
