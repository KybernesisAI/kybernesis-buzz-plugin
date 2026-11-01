// Kybernesis for Buzz.
//
// Sets up a Kybernesis agent: a Buzz Claude agent that runs on the person's
// own Claude plan, with long-term memory. The person signs in with their Buzz
// identity (no email, no password), the plugin gets a lasting memory key from
// buzz.kybernesis.ai, writes the agent's folder (instructions, memory server,
// skills) and creates the agent with one button.

export const inject = ["react", "pages", "relay", "agents", "host"];

const SITE = "https://buzz.kybernesis.ai";
const CLAUDE_TYPE = "buzz.claude-code/claude-code";
const HOME = "~/Kybernesis";
const SIGNIN_KIND = 30315;
const SIGNIN_D = "kybernesis-signin";

export function apply(ctx) {
  const React = ctx.react;
  const h = React.createElement;
  const { useEffect, useState } = React;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const errorText = (error) => (error && error.message) || String(error);

  // ── Files ────────────────────────────────────────────────────────────

  async function writeFile(path, text) {
    const proc = await ctx.host.spawn("write-file", { args: [path] });
    await proc.end(text);
    const code = await proc.exited;
    if (code !== 0) throw new Error(`Could not write ${path}`);
  }

  async function readText(path) {
    return new TextDecoder().decode(await ctx.host.readFile(path));
  }

  async function homeDir() {
    return ctx.host.resolveDirectory(HOME);
  }

  // The agents this plugin made on this Mac: [{ name, folder, pubkey, workspace, createdAt }].
  async function loadAgents() {
    try {
      const list = JSON.parse(await readText(`${await homeDir()}/agents.json`));
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  async function saveAgents(list) {
    await writeFile(`${await homeDir()}/agents.json`, JSON.stringify(list, null, 2) + "\n");
  }

  // ── Server ───────────────────────────────────────────────────────────

  async function call(url, { body, headers = {} } = {}) {
    const response = await ctx.host.request({
      url,
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body ?? {}),
    });
    let json = {};
    try {
      json = JSON.parse(response.body);
    } catch {
      json = {};
    }
    return { status: response.status, json };
  }

  // ── Sign in with the Buzz identity ───────────────────────────────────

  const b64url = (bytes) =>
    btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  let session = null; // { token, expiresAt, pubkey }, kept only while Buzz is open

  async function signIn(progress) {
    const now = Math.floor(Date.now() / 1000);
    const relay = ctx.relay.snapshot();
    if (relay.status !== "ready") throw new Error("Buzz isn't connected to your community yet. Try again in a moment.");
    const viewer = relay.viewer;
    if (session && session.pubkey === viewer && session.expiresAt > now + 300) return session;

    const outbox = relay.session && relay.session.outbox;
    if (!outbox || !outbox.supports(SIGNIN_KIND)) throw new Error("This version of Buzz can't sign in plugins. Update Buzz and try again.");

    progress("Signing in with your Buzz identity…");
    // A throwaway key that never leaves this Mac. The server binds the
    // challenge to it, so the signed event on the relay can't be reused.
    const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, false, ["sign", "verify"]);
    const clientKey = b64url(await crypto.subtle.exportKey("raw", pair.publicKey));

    const issued = await call(`${SITE}/api/auth/challenge`, { body: { pubkey: viewer, clientKey } });
    if (issued.status !== 200 || !issued.json.challenge) throw new Error(`Sign-in isn't available right now (${issued.json.error || issued.status}).`);
    const challenge = issued.json.challenge;

    // Sent with a recovery key, the outbox keeps the signed copy until we acknowledge it.
    const id = outbox.send(
      { kind: SIGNIN_KIND, content: challenge, tags: [["d", SIGNIN_D]] },
      { key: `${SIGNIN_D}:${challenge}`, value: "1" },
    );
    let signed;
    let last;
    for (let i = 0; i < 80 && !signed; i++) {
      last = outbox.snapshot().find((item) => item.event.id === id);
      if (last && last.signed) signed = last.signed;
      else await sleep(250);
    }
    try {
      Promise.resolve(outbox.acknowledge(id)).catch(() => {});
    } catch {
      // Already gone from the outbox.
    }
    if (!signed) throw new Error(`Buzz didn't sign the sign-in request${last && last.error ? `: ${last.error}` : ""}. Try again.`);

    const proof = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, pair.privateKey, new TextEncoder().encode(`${SIGNIN_D}|${signed.id}`));
    const event = {
      id: signed.id,
      pubkey: signed.pubkey,
      created_at: signed.created_at,
      kind: signed.kind,
      tags: signed.tags,
      content: signed.content,
      sig: signed.sig,
    };
    const verified = await call(`${SITE}/api/auth/verify`, { body: { event, clientKey, clientSig: b64url(proof) } });
    if (verified.status !== 200 || !verified.json.token) throw new Error(`Sign-in was refused (${verified.json.error || verified.status}).`);
    session = verified.json;
    return session;
  }

  // ── Memory ───────────────────────────────────────────────────────────

  async function getMemory(progress) {
    const s = await signIn(progress);
    progress("Setting up its memory…");
    const res = await call(`${SITE}/api/memory`, { body: {}, headers: { authorization: `Bearer ${s.token}` } });
    if (res.status === 401) {
      session = null;
      throw new Error("Your sign-in ran out. Press the button again.");
    }
    if (res.status !== 200 || !res.json.key) throw new Error(`Memory isn't available right now (${res.json.error || res.status}).`);
    return res.json; // { workspace, key, mcpUrl }
  }

  function mcpConfig(memory) {
    return {
      mcpServers: {
        memory: {
          type: "http",
          url: memory.mcpUrl,
          headers: { Authorization: `Bearer ${memory.key}`, "X-Kyberagent-Agent": memory.workspace },
        },
      },
    };
  }

  async function readMemoryConfig(folder) {
    const server = JSON.parse(await readText(`${folder}/.mcp.json`)).mcpServers.memory;
    return { url: server.url, headers: server.headers };
  }

  // Asks the memory server to check itself with the key in the agent's folder.
  async function checkMemory(folder) {
    try {
      const { url, headers } = await readMemoryConfig(folder);
      const response = await ctx.host.request({
        url,
        method: "POST",
        headers: { ...headers, "content-type": "application/json", accept: "application/json, text/event-stream" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "arcana_validate", arguments: {} } }),
      });
      if (response.status !== 200) return { ok: false, detail: `answered ${response.status}` };
      const text = response.body.trim().startsWith("{")
        ? response.body
        : (response.body.split("\n").find((line) => line.startsWith("data:")) || "").slice(5);
      const reply = JSON.parse(text);
      if (reply.error || !reply.result || reply.result.isError) return { ok: false, detail: "not working" };
      return { ok: true };
    } catch (error) {
      return { ok: false, detail: errorText(error) };
    }
  }

  // ── Claude ───────────────────────────────────────────────────────────

  function claudeStatus() {
    const type = ctx.agents.types().find((t) => t.id === CLAUDE_TYPE || t.key === CLAUDE_TYPE || /claude/i.test(t.title || ""));
    if (!type) return { ready: false, label: "Claude isn't available in this version of Buzz." };
    let snap;
    try {
      snap = type.provider ? type.provider.snapshot() : undefined;
    } catch {
      snap = undefined;
    }
    if (snap && (snap.readiness === "attention" || snap.readiness === "unavailable" || snap.readiness === "error")) {
      return { ready: false, label: snap.attentionLabel || "Claude needs attention in Buzz." };
    }
    return { ready: true };
  }

  // ── Create ───────────────────────────────────────────────────────────

  const slugify = (name) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "agent";

  async function createAgent({ name, focus }, progress) {
    if (!name) throw new Error("Give your agent a name first.");
    const claude = claudeStatus();
    if (!claude.ready) throw new Error(claude.label);
    const memory = await getMemory(progress);

    progress("Writing its folder…");
    const agents = await loadAgents();
    const home = await homeDir();
    let slug = slugify(name);
    for (let n = 2; agents.some((a) => a.folder === `${home}/agents/${slug}`); n++) slug = `${slugify(name)}-${n}`;
    const folder = `${home}/agents/${slug}`;
    for (const file of agentFiles({ name, focus })) await writeFile(`${folder}/${file.path}`, file.text);
    const mcp = JSON.stringify(mcpConfig(memory), null, 2) + "\n";
    await writeFile(`${folder}/.mcp.json`, mcp);
    // Getting memory hands out a new key and retires the old one, so every
    // agent made before this one gets the new key too.
    for (const agent of agents) {
      try {
        await writeFile(`${agent.folder}/.mcp.json`, mcp);
      } catch {
        // A folder the person deleted; nothing to update.
      }
    }

    progress("Checking its memory…");
    const health = await checkMemory(folder);
    if (!health.ok) throw new Error(`Its memory didn't answer (${health.detail}). Press the button again.`);

    progress("Creating the agent…");
    const created = await ctx.agents.create({
      type: CLAUDE_TYPE,
      name,
      config: {
        model: "",
        effort: "",
        scope: "thread",
        workspace: folder,
        instructions: "You are a Kybernesis agent. Follow CLAUDE.md in your working folder.",
      },
    });
    const entry = { name, folder, pubkey: created.pubkey, workspace: memory.workspace, createdAt: new Date().toISOString() };
    await saveAgents([...agents, entry]);
    return entry;
  }

  // ── Page ─────────────────────────────────────────────────────────────

  const card = { padding: "var(--space-panel-inset, 16px)", marginBottom: 16 };
  const field = { display: "block", width: "100%", marginTop: 6, marginBottom: 14, padding: "8px 10px", font: "inherit", color: "inherit", background: "transparent", border: "1px solid var(--border, rgba(127,127,127,.35))", borderRadius: 6 };

  function ClaudeCard({ status, onCheck }) {
    if (status.ready) return null;
    return h(
      "section",
      { className: "ui-card", style: card },
      h("h2", { style: { marginTop: 0 } }, "First, turn on Claude"),
      h("p", null, "Your agent runs on your own Claude plan (Pro or Max). In Buzz, open Settings, then Agent setup, then Claude. Press Install, then Sign in."),
      h("p", { style: { opacity: 0.7 } }, `Buzz says: ${status.label}`),
      h("button", { className: "ui-button", onClick: onCheck }, "Check again"),
    );
  }

  function AgentRow({ agent }) {
    const [memory, setMemory] = useState("checking");
    useEffect(() => {
      let live = true;
      checkMemory(agent.folder).then((r) => live && setMemory(r.ok ? "ok" : "down"));
      return () => {
        live = false;
      };
    }, [agent.folder]);
    const label = { checking: "Checking memory…", ok: "Memory is working", down: "Memory isn't answering" }[memory];
    return h(
      "li",
      { style: { marginBottom: 10 } },
      h("strong", null, agent.name),
      h("span", { style: { opacity: 0.7, marginLeft: 8 } }, label),
    );
  }

  function AgentsCard({ agents }) {
    if (!agents.length) return null;
    return h(
      "section",
      { className: "ui-card", style: card },
      h("h2", { style: { marginTop: 0 } }, agents.length === 1 ? "Your agent" : "Your agents"),
      h("ul", { style: { paddingLeft: 18, margin: 0 } }, agents.map((a) => h(AgentRow, { key: a.folder, agent: a }))),
      h("p", { style: { opacity: 0.7, marginBottom: 0 } }, "Open a DM with your agent in Buzz to talk to it, or add it to a channel. Buzz must be open for it to answer."),
    );
  }

  function CreateCard({ claude, agents, onCreated }) {
    const [name, setName] = useState(agents.length ? "" : "Kybernesis");
    const [focus, setFocus] = useState("");
    const [busy, setBusy] = useState(false);
    const [step, setStep] = useState("");
    const [problem, setProblem] = useState("");
    const [done, setDone] = useState(null);

    const submit = async () => {
      setBusy(true);
      setProblem("");
      setDone(null);
      try {
        const entry = await createAgent({ name: name.trim(), focus: focus.trim() }, setStep);
        setDone(entry);
        onCreated();
      } catch (error) {
        setProblem(errorText(error));
      } finally {
        setBusy(false);
        setStep("");
      }
    };

    return h(
      "section",
      { className: "ui-card", style: card },
      h("h2", { style: { marginTop: 0 } }, agents.length ? "Create another agent" : "Create your agent"),
      h("p", null, "It runs on your Claude plan, works in your Buzz DMs and channels, and remembers what matters across every conversation."),
      h("label", null, "Name", h("input", { style: field, value: name, maxLength: 40, disabled: busy, onChange: (e) => setName(e.target.value) })),
      h(
        "label",
        null,
        "What should it help you with? (optional)",
        h("textarea", { style: { ...field, minHeight: 72 }, value: focus, maxLength: 1000, disabled: busy, placeholder: "For example: keep track of my clients, draft follow-ups, remember what we decided.", onChange: (e) => setFocus(e.target.value) }),
      ),
      h("button", { className: "ui-button", disabled: busy || !claude.ready || !name.trim(), onClick: submit }, busy ? "Working…" : "Create my agent"),
      step && h("p", { style: { opacity: 0.7 } }, step),
      problem && h("p", { style: { color: "var(--color-danger, #c0392b)" } }, problem),
      done && h("p", null, `${done.name} is ready. Open a DM with ${done.name} in Buzz and say hello.`),
    );
  }

  ctx.pages.register({
    id: "home",
    title: "Kybernesis",
    primary: true,
    component: function Home() {
      const [claude, setClaude] = useState(() => claudeStatus());
      const [agents, setAgents] = useState([]);
      const refresh = () => {
        setClaude(claudeStatus());
        loadAgents().then(setAgents);
      };
      useEffect(refresh, []);
      return h(
        "div",
        { style: { padding: "var(--space-panel-inset, 16px)", maxWidth: 720 } },
        h("h1", null, "Kybernesis"),
        h("p", { style: { opacity: 0.7 } }, "Your own agent in Buzz, with a memory that lasts."),
        h(ClaudeCard, { status: claude, onCheck: refresh }),
        h(AgentsCard, { agents }),
        h(CreateCard, { claude, agents, onCreated: refresh }),
      );
    },
  });

  // ── The agent's folder ───────────────────────────────────────────────

  function agentFiles({ name, focus }) {
    const settings = { enableAllProjectMcpServers: true, enabledMcpjsonServers: ["memory"] };
    return [
      { path: "CLAUDE.md", text: claudeMd(name, focus) },
      { path: ".claude/settings.json", text: JSON.stringify(settings, null, 2) + "\n" },
      { path: ".claude/skills/recall/SKILL.md", text: RECALL_SKILL },
      { path: ".claude/skills/remember/SKILL.md", text: REMEMBER_SKILL },
      { path: ".claude/skills/notes/SKILL.md", text: NOTES_SKILL },
    ];
  }

  function claudeMd(name, focus) {
    const about = focus ? `\n## What your owner wants help with\n\n${focus.replace(/\r/g, "")}\n` : "";
    return `# ${name}

You are ${name}, a Kybernesis agent. You work in Buzz, a team chat app, for the person who created you: answer their DMs, and help in the channels they add you to. Keep replies short and plain, the way a capable colleague writes in chat.
${about}
## Memory

You have long-term memory that lasts across every conversation and thread. Its tools come from the \`memory\` MCP server: \`arcana_recall\`, \`arcana_search\`, \`arcana_timeline\`, \`arcana_remember\` and the \`arcana_brain_*\` tools. When they are not in your tool list, search your tools for "recall".

Always call it "your memory" when you talk to people. Never name the tools or the service behind them.

Recall first. Whenever someone mentions a person, project, company, meeting or past decision, or asks what you know, look it up before answering: \`arcana_recall\` for a named person, project or company, \`arcana_search\` for anything broader, \`arcana_timeline\` for what happened recently. If nothing is found, answer normally without mentioning the lookup.

Never claim you don't know without searching. If recall comes back empty, run \`arcana_search\` with the phrase before saying you have nothing on it.

Remember without being asked. Store new facts as they come up: a person and their role, a decision, a deadline, a preference. Never refuse a "remember this". Confirm briefly what you saved.

For long material (meeting notes, research, decisions with their reasons), use the notes skill.

Never save passwords, access tokens, payment details, private keys or one-time codes.

Load the recall, remember or notes skill for the full steps when a memory task is more than one obvious call.
`;
  }

  const RECALL_SKILL = `---
description: "Look up what your memory knows about a person, project, company, place or topic. Use whenever someone mentions a name, references a project or company, asks about past conversations, or says who is, what do we know about, tell me about, or recall."
---

# Recall

Look things up before answering. Do not wait for the word "recall": if a name or project comes up and you have no fresh context on it from this conversation, look it up.

1. Use the most specific name you have ("Sarah Chen", not "Sarah").
2. Pick the tool:
   - A person, company or project: \`arcana_recall({ entity })\`
   - Recent events: \`arcana_timeline({ today: true })\`, \`({ week: true })\` or \`({ search: "<keywords>" })\`
   - Anything else: \`arcana_search({ query })\`
3. An empty \`arcana_recall\` only means no entity matched. Follow up with \`arcana_search\`, and \`arcana_timeline({ search })\` for recent things. Only an empty search means you have nothing on it.
4. Answer from what came back, in your own words. Say "I remember" or "your memory", never the tool names. If nothing came back, answer normally without mentioning the lookup.

"What do you know about me?": call \`arcana_brain_stats\`, search for the person's name, read \`arcana_timeline({ week: true })\`, then sum it up.
`;

  const REMEMBER_SKILL = `---
description: "Save a fact, decision, preference, deadline or detail about a person or project to your memory. Use without being asked whenever something worth keeping comes up, and whenever someone says remember, note this, keep track of, or don't forget."
---

# Remember

Store things as they come up: a new person and their role, a decision, a deadline, a preference, a new project, a summary of a meeting. Skip small talk and things already saved in this conversation.

1. Write one clear sentence that makes sense on its own, with names and dates: "Met Sarah Chen from Acme on 23 Feb about the dashboard integration."
2. Call \`arcana_remember\` with \`text\`. Add \`project\` (a lowercase slug) or \`tags\` only when they are obvious; never invent them.
3. One fact per call. Several facts means several calls.
4. Confirm in a few words ("Noted."). When asked to remember something, say what you saved.

When someone corrects you ("actually, she left Acme"), save the correct fact and say "Corrected."

Never save passwords, access tokens, payment details, private keys or one-time codes.
`;

  const NOTES_SKILL = `---
description: "Save long material to your memory as a note: meeting notes, research, reference material, or a decision with its reasons. Use when someone shares something too long for one fact, or says write this down, document this, or take notes."
---

# Notes

A note is a markdown file in your memory plus an index entry so it can be found later. Always do both steps.

1. Pick a short kebab-case file name, one topic per note (\`meeting-notes-2026-11.md\`). Check \`arcana_brain_list({ source: "brain" })\` first; if a note on the topic exists, read it with \`arcana_brain_read\`, add your new section, and write the whole thing back.
2. Write it with \`arcana_brain_write({ name, content })\`. Include dates. For a decision: Context, Decision, Reasons, Options considered. For a meeting: Who, Summary, Decisions, Next steps.
3. Index it with \`arcana_brain_add({ content, title, type: "note", source_path: "brain/<name>" })\`. When you added to an existing note, index only the new section.
4. Say what you saved and its title.

For a single fact, use the remember skill instead.
`;
}
