# Kybernesis for Buzz

A Buzz desktop plugin that sets up a Kybernesis agent: a Buzz Claude agent with long-term memory, running on the person's own Claude plan. Its server is buzz.kybernesis.ai (`KybernesisAI/kybernesis-buzz`).

## Install

Settings → Plugins → Manage plugins → Add, enter `https://github.com/KybernesisAI/kybernesis-buzz-plugin`, pick **Kybernesis**, Install. The page appears in the sidebar as **Kybernesis**.

The agent runs on Claude, so Claude must be on in Buzz: Settings → Agent setup → Claude → Install, then Sign in. The page says so when it isn't.

## What Create does

1. Signs in to buzz.kybernesis.ai with the person's Buzz identity: the server issues a challenge bound to a throwaway browser key, the Buzz key signs it as a kind 30315 event (`d=kybernesis-signin`, never shown as a status), and the throwaway key signs the event id. No email, no password.
2. Gets the person's memory key (one memory per Buzz identity).
3. Writes the agent's folder under `~/Kybernesis/agents/<name>`: `CLAUDE.md`, `.mcp.json` (memory server), `.claude/settings.json`, and the recall, remember and notes skills. Every earlier agent's `.mcp.json` gets the new key, because getting a key retires the old one.
4. Checks the memory answers with that key.
5. Creates the Buzz Claude agent working in that folder.

`~/Kybernesis/agents.json` lists the agents made on this Mac. The page shows each one with whether its memory is working.
