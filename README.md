# Kybernesis for Buzz

A Buzz desktop plugin that sets up a Kybernesis agent: a Buzz Claude agent with long-term memory, running on the person's own Claude plan.

**Current build: spike.** `release/` holds a throwaway test page that proves the four things the product depends on. It is replaced by the real plugin once they pass.

## Install

Settings → Plugins → Manage plugins → Add, enter `KybernesisAI/kybernesis-buzz-plugin`, pick **Kybernesis**, Install. The page appears in the sidebar as **Kybernesis**.

Before step 5, Claude must be on in Buzz: Settings → Agent setup → Claude → Install, then Sign in.

## Spike steps

1. **Who am I** shows your Buzz identity and whether Claude is ready.
2. **Sign** publishes one app-data event (kind 30078) and reads back the copy signed by your Buzz key. Pass: `pubkeyMatchesViewer: true` and `hasSignature: true`.
3. **Write** writes a test file under `~/Kybernesis/agents/spike` and reads it back. Pass: `roundTrip: true`.
4. **Connect memory** opens a sign-in link. Approve it and pick a test memory workspace. The plugin writes the agent's folder (instructions, memory server, skills). The token lasts 24 hours.
5. **Create agent** makes a Claude agent called Kybernesis spike that works in that folder, with no review form. Pass: it appears in Agents.

Then DM **Kybernesis spike** and ask, one message each:

- "What is the spike codeword?" Expect TANGERINE-41 (its folder's instructions loaded).
- "What is the spike skill word?" Expect LANTERN-7 (its folder's skills loaded).
- "Remember that the spike test ran on 1 November." Expect it to save to memory.
- In a new thread: "What do you remember about the spike test?" Expect it to recall the date from memory.
