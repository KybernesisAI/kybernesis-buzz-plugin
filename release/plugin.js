// Kybernesis for Buzz.
//
// Sets up and looks after Kybernesis agents: Buzz Claude agents that run on
// the person's own Claude plan, with a memory that lasts. The person signs in
// with their Buzz identity (no email, no password). buzz.kybernesis.ai keeps
// their account: agents, memory and profile. This page creates agents, shows
// them as cards, and applies edits made on the site to each agent's folder.

export const inject = ["react", "pages", "relay", "agents", "host"];

const SITE = "https://buzz.kybernesis.ai";
const AVATAR = `${SITE}/agent.png`;
const CLAUDE_TYPE = "buzz.claude-code/claude-code";
const HOME = "~/Kybernesis";
const SIGNIN_KIND = 30315;
const SIGNIN_D = "kybernesis-signin";

const ROBOT_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="31" y="6" width="2" height="8" fill="#1e293b"/><rect x="28" y="3" width="8" height="5" fill="#059669"/><rect x="8" y="27" width="5" height="14" fill="#1e293b"/><rect x="51" y="27" width="5" height="14" fill="#1e293b"/><rect x="13" y="14" width="38" height="36" fill="#1e293b"/><rect x="18" y="21" width="28" height="13" fill="#0a0a0a"/><rect x="22" y="25" width="6" height="5" fill="#10b981"/><rect x="36" y="25" width="6" height="5" fill="#10b981"/><rect x="25" y="40" width="14" height="3" fill="#059669"/><rect x="18" y="53" width="28" height="7" fill="#059669"/></svg>';
const ICON = `data:image/svg+xml;utf8,${encodeURIComponent(ROBOT_SVG)}`;

const CSS = `
.kyb { --bg:#faf9f7; --surface:#fff; --sunk:#f5f4f2; --ink:#1e293b; --ink2:#475569; --ink3:#64748b; --muted:#94a3b8; --line:#e8e6e1; --line2:#d5d3ce; --em:#059669; --em2:#047857; --emt:rgba(5,150,105,.1); --amber:#d97706; --red:#dc2626;
  --mono: "Space Mono", ui-monospace, "SF Mono", Menlo, monospace; --sans: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  min-height:100%; background:var(--bg); color:var(--ink); font-family:var(--sans); font-weight:400; font-size:14px; -webkit-font-smoothing:antialiased; }
.kyb * { box-sizing:border-box; border-radius:0; }
.kyb .in { max-width:980px; margin:0 auto; padding:0 24px; }
.kyb .top { background:var(--surface); border-bottom:1px solid var(--line); }
.kyb .top .in { display:flex; align-items:center; justify-content:space-between; gap:12px; height:56px; }
.kyb .mark { font-family:var(--mono); font-size:14px; color:var(--em); letter-spacing:.02em; }
.kyb .acts { display:flex; gap:8px; align-items:center; }
.kyb .body { padding:28px 0 56px; }
.kyb h1 { font-family:var(--mono); font-weight:400; font-size:24px; line-height:1.25; margin:0 0 8px; letter-spacing:-.01em; color:var(--ink); }
.kyb h1 em { font-style:normal; color:var(--em); }
.kyb h2 { font-family:var(--mono); font-weight:400; font-size:16px; margin:0; color:var(--ink); }
.kyb p { line-height:1.6; margin:0 0 12px; }
.kyb .muted { color:var(--ink3); }
.kyb .small { font-size:12.5px; }
.kyb .title { font-family:var(--mono); font-size:11.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--ink2); margin:0 0 14px; }
.kyb .title::before { content:"// "; color:var(--em); }
.kyb .label { font-family:var(--mono); font-size:10.5px; letter-spacing:.1em; text-transform:uppercase; color:var(--ink3); }
.kyb .panel { background:var(--surface); border:1px solid var(--line); padding:20px; }
.kyb .gap { height:16px; }
.kyb .btn { display:inline-flex; align-items:center; gap:6px; font-family:var(--mono); font-size:11px; letter-spacing:.06em; text-transform:uppercase; padding:8px 12px; border:1px solid var(--ink); background:var(--ink); color:#fff; cursor:pointer; text-decoration:none; line-height:1; }
.kyb .btn:hover { background:#0f172a; }
.kyb .btn:disabled { opacity:.45; cursor:default; }
.kyb .btn.em { background:var(--em); border-color:var(--em); }
.kyb .btn.em:hover { background:var(--em2); }
.kyb .btn.ghost { background:transparent; color:var(--ink); border-color:var(--line2); }
.kyb .btn.ghost:hover { border-color:var(--ink3); }
.kyb .btn.big { padding:12px 18px; font-size:12px; }
.kyb label.f { display:block; margin-bottom:14px; }
.kyb label.f > span { display:block; font-family:var(--mono); font-size:10.5px; letter-spacing:.1em; text-transform:uppercase; color:var(--ink3); margin-bottom:6px; }
.kyb input, .kyb textarea { width:100%; padding:9px 11px; background:var(--surface); color:var(--ink); border:1px solid var(--line2); font:inherit; }
.kyb input:focus, .kyb textarea:focus { outline:none; border-color:var(--em); box-shadow:0 0 0 3px var(--emt); }
.kyb textarea { min-height:84px; resize:vertical; }
.kyb .grid { display:grid; gap:16px; grid-template-columns:repeat(auto-fill, minmax(270px, 1fr)); }
.kyb .card { background:var(--surface); border:1px solid var(--line); padding:18px; display:flex; flex-direction:column; gap:12px; }
.kyb .card:hover { border-color:var(--line2); }
.kyb .who { display:flex; gap:12px; align-items:center; min-width:0; }
.kyb .avatar { width:46px; height:46px; flex:none; border:1px solid var(--line); background:var(--sunk); object-fit:cover; display:block; }
.kyb .role { color:var(--ink3); font-size:12.5px; margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.kyb .focus { color:var(--ink2); font-size:13px; line-height:1.55; margin:0; }
.kyb .foot { display:flex; justify-content:space-between; align-items:center; gap:8px; border-top:1px solid var(--line); padding-top:12px; margin-top:auto; }
.kyb .sts { display:flex; flex-direction:column; gap:6px; }
.kyb .st { display:inline-flex; align-items:center; gap:6px; font-family:var(--mono); font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--ink3); }
.kyb .st::before { content:""; width:7px; height:7px; background:var(--muted); }
.kyb .st.ok { color:var(--em); } .kyb .st.ok::before { background:var(--em); box-shadow:0 0 6px rgba(5,150,105,.5); }
.kyb .st.warn { color:var(--amber); } .kyb .st.warn::before { background:var(--amber); }
.kyb .st.bad { color:var(--red); } .kyb .st.bad::before { background:var(--red); }
.kyb .link { background:none; border:0; padding:0; font-family:var(--mono); font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--ink3); cursor:pointer; text-decoration:none; }
.kyb .link:hover { color:var(--em); }
.kyb .steps { list-style:none; margin:0; padding:0; }
.kyb .steps li { display:flex; gap:14px; padding:12px 0; border-top:1px solid var(--line); align-items:flex-start; }
.kyb .steps li:first-child { border-top:0; padding-top:0; }
.kyb .num { font-family:var(--mono); color:var(--em); width:22px; flex:none; }
.kyb .num.done { color:var(--em); }
.kyb .progress { list-style:none; margin:14px 0 0; padding:0; font-family:var(--mono); font-size:11.5px; letter-spacing:.04em; }
.kyb .progress li { padding:4px 0; color:var(--muted); }
.kyb .progress li.on { color:var(--ink); }
.kyb .progress li.done { color:var(--em); }
.kyb .notice { border:1px solid var(--line); border-left:3px solid var(--em); background:var(--surface); padding:11px 14px; font-size:13px; }
.kyb .notice.bad { border-left-color:var(--red); }
.kyb .hero { display:grid; grid-template-columns:minmax(0,1fr) 300px; gap:24px; align-items:start; }
@media (max-width:820px) { .kyb .hero { grid-template-columns:1fr; } }
.kyb .art { background:var(--surface); border:1px solid var(--line); padding:24px; display:flex; flex-direction:column; align-items:center; gap:14px; text-align:center; }
.kyb .art img { width:120px; height:120px; image-rendering:pixelated; }
.kyb .row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
.kyb .spread { display:flex; gap:10px; align-items:center; justify-content:space-between; flex-wrap:wrap; }
.kyb .fine { margin-top:28px; font-family:var(--mono); font-size:10.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); }
`;

export function apply(ctx) {
  const React = ctx.react;
  const h = React.createElement;
  const { useEffect, useState, useRef } = React;

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

  // The agents this plugin made on this Mac: [{ name, role, focus, picture, folder, pubkey, workspace, createdAt }].
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

  async function call(path, { method = "POST", body, token } = {}) {
    const response = await ctx.host.request({
      url: `${SITE}${path}`,
      method,
      headers: {
        ...(body !== undefined || method === "POST" ? { "content-type": "application/json" } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      ...(method === "GET" || method === "DELETE" ? {} : { body: JSON.stringify(body ?? {}) }),
    });
    let json = {};
    try {
      json = JSON.parse(response.body);
    } catch {
      json = {};
    }
    if (response.status === 401 && token) session = null;
    return { status: response.status, json };
  }

  // ── Sign in with the Buzz identity ───────────────────────────────────

  const b64url = (bytes) =>
    btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  let session = null; // { token, expiresAt, pubkey }, kept only while Buzz is open
  let signingIn = null;

  function signIn() {
    if (!signingIn) signingIn = doSignIn().finally(() => (signingIn = null));
    return signingIn;
  }

  async function doSignIn() {
    const now = Math.floor(Date.now() / 1000);
    const relay = ctx.relay.snapshot();
    if (relay.status !== "ready") throw new Error("Buzz isn't connected to your community yet. Try again in a moment.");
    const viewer = relay.viewer;
    if (session && session.pubkey === viewer && session.expiresAt > now + 300) return session;

    const outbox = relay.session && relay.session.outbox;
    if (!outbox || !outbox.supports(SIGNIN_KIND)) throw new Error("This version of Buzz can't sign in plugins. Update Buzz and try again.");

    // A throwaway key that never leaves this Mac. The server binds the
    // challenge to it, so the signed event on the relay can't be reused.
    const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, false, ["sign", "verify"]);
    const clientKey = b64url(await crypto.subtle.exportKey("raw", pair.publicKey));

    const issued = await call("/api/auth/challenge", { body: { pubkey: viewer, clientKey } });
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
    const verified = await call("/api/auth/verify", { body: { event, clientKey, clientSig: b64url(proof) } });
    if (verified.status !== 200 || !verified.json.token) throw new Error(`Sign-in was refused (${verified.json.error || verified.status}).`);
    session = verified.json;
    return session;
  }

  // Opens the person's account on buzz.kybernesis.ai, already signed in.
  async function openAccount(to = "/account") {
    const s = await signIn();
    const res = await call("/api/auth/link", { body: { to }, token: s.token });
    if (res.status !== 200 || !res.json.url) throw new Error("Couldn't open your account. Try again.");
    const a = document.createElement("a");
    a.href = res.json.url;
    a.target = "_blank";
    a.rel = "noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
    return res.json.url;
  }

  // ── Memory ───────────────────────────────────────────────────────────

  // Every agent has its own memory, made the first time it is asked for and
  // the same key after that. No agent can see another's.
  async function getMemory(pubkey, name) {
    const s = await signIn();
    const res = await call("/api/memory", { token: s.token, body: { agent: pubkey, name } });
    if (res.status === 401) throw new Error("Your sign-in ran out. Try again.");
    if (res.status !== 200 || !res.json.key) throw new Error(`Memory isn't available right now (${res.json.error || res.status}).`);
    return res.json; // { workspace, key, mcpUrl }
  }

  async function getMemories(pubkeys) {
    if (!pubkeys.length) return {};
    const s = await signIn();
    const res = await call("/api/memory", { token: s.token, body: { agents: pubkeys } });
    if (res.status !== 200 || !res.json.grants) throw new Error(`Memory isn't available right now (${res.json.error || res.status}).`);
    return res.json.grants; // { <pubkey>: { workspace, key, mcpUrl } }
  }

  // The agent's tool servers: its own memory, and the Kybernesis tools
  // (pages, cards, routines) under its own token.
  function mcpText(memory) {
    const config = {
      mcpServers: {
        memory: {
          type: "http",
          url: memory.mcpUrl,
          headers: { Authorization: `Bearer ${memory.key}`, "X-Kyberagent-Agent": memory.workspace },
        },
        ...(memory.tools
          ? { kybernesis: { type: "http", url: memory.tools.url, headers: { Authorization: `Bearer ${memory.tools.token}` } } }
          : {}),
      },
    };
    return JSON.stringify(config, null, 2) + "\n";
  }

  // Writes an agent's own memory key into its folder when it isn't there yet.
  async function writeMemoryKey(folder, memory) {
    const text = mcpText(memory);
    let current = "";
    try {
      current = await readText(`${folder}/.mcp.json`);
    } catch {
      current = "";
    }
    if (current === text) return;
    try {
      await writeFile(`${folder}/.mcp.json`, text);
    } catch {
      // A folder the person deleted; nothing to update.
    }
  }

  // Asks the memory server to check itself with the key in the agent's folder.
  async function checkMemory(folder) {
    try {
      const server = JSON.parse(await readText(`${folder}/.mcp.json`)).mcpServers.memory;
      const response = await ctx.host.request({
        url: server.url,
        method: "POST",
        headers: { ...server.headers, "content-type": "application/json", accept: "application/json, text/event-stream" },
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

  // ── Claude and Buzz agents ───────────────────────────────────────────

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

  function buzzAgent(pubkey) {
    try {
      return ctx.agents.find(pubkey);
    } catch {
      return undefined;
    }
  }

  function isRunning(pubkey) {
    try {
      return ctx.agents.snapshot().running.some((a) => a.pubkey === pubkey);
    } catch {
      return false;
    }
  }

  // ── Create ───────────────────────────────────────────────────────────

  const slugify = (name) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "agent";

  // Bumped whenever the files an agent's folder gets (instructions, skills) change;
  // the next sync rewrites older folders.
  const KIT_VERSION = 8;

  const STEPS = ["Sign in with your Buzz identity", "Write its folder", "Create the agent", "Set up its own memory", "Check its memory"];

  async function createAgent({ name, role, focus }, step) {
    if (!name) throw new Error("Give your agent a name first.");
    const claude = claudeStatus();
    if (!claude.ready) throw new Error(claude.label);
    step(0);
    const s = await signIn();

    step(1);
    const agents = await loadAgents();
    const home = await homeDir();
    let slug = slugify(name);
    for (let n = 2; agents.some((a) => a.folder === `${home}/agents/${slug}`); n++) slug = `${slugify(name)}-${n}`;
    const folder = `${home}/agents/${slug}`;
    for (const file of agentFiles({ name, role, focus })) await writeFile(`${folder}/${file.path}`, file.text);

    // The agent comes first because its own memory is named after its Buzz key.
    // It doesn't run until someone messages it, so the key is in place by then.
    step(2);
    const created = await ctx.agents.create({
      type: CLAUDE_TYPE,
      name,
      picture: AVATAR,
      config: {
        model: "",
        effort: "",
        scope: "thread",
        workspace: folder,
        instructions: "You are a Kybernesis agent. Follow CLAUDE.md in your working folder.",
      },
    });
    const now = new Date().toISOString();
    const entry = { name, role, focus, picture: AVATAR, folder, pubkey: created.pubkey, kit: KIT_VERSION, createdAt: now, syncedAt: now };
    await saveAgents([...agents, entry]);
    await call("/api/agents", { token: s.token, body: { id: created.pubkey, name, role, focus, picture: AVATAR } });

    step(3);
    const memory = await getMemory(created.pubkey, name);
    await writeFile(`${folder}/.mcp.json`, mcpText(memory));
    entry.workspace = memory.workspace;
    await saveAgents([...agents, entry]);

    step(4);
    const health = await checkMemory(folder);
    if (!health.ok) throw new Error(`${name} is created, but its memory didn't answer (${health.detail}). Reopen Kybernesis to try again.`);
    step(5);
    return entry;
  }

  // ── Sync with the account on buzz.kybernesis.ai ──────────────────────

  // Registers agents the site doesn't know yet, applies edits made on the
  // site (name, role, focus, picture) to each agent's folder and Buzz
  // profile, and keeps every folder on the current memory key.
  async function sync() {
    const agents = await loadAgents();
    if (!agents.length) return agents;
    const s = await signIn();
    const res = await call("/api/agents", { method: "GET", token: s.token });
    if (res.status !== 200) return agents;
    const remote = new Map((res.json.agents || []).map((a) => [a.id, a]));
    let changed = false;
    const next = [];
    for (const local of agents) {
      const site = local.pubkey && remote.get(local.pubkey);
      if (!site) {
        if (local.pubkey) {
          await call("/api/agents", {
            token: s.token,
            body: { id: local.pubkey, name: local.name, role: local.role, focus: local.focus, picture: local.picture || AVATAR },
          });
        }
        next.push(local);
        continue;
      }
      const same = site.name === local.name && (site.role || "") === (local.role || "") && (site.focus || "") === (local.focus || "") && (site.picture || "") === (local.picture || "");
      if (same) {
        if (local.kit !== KIT_VERSION) {
          for (const file of agentFiles(local)) await writeFile(`${local.folder}/${file.path}`, file.text);
          next.push({ ...local, kit: KIT_VERSION });
          changed = true;
        } else next.push(local);
        continue;
      }
      const updated = { ...local, name: site.name, role: site.role || "", focus: site.focus || "", picture: site.picture || "", kit: KIT_VERSION, syncedAt: new Date().toISOString() };
      for (const file of agentFiles(updated)) await writeFile(`${local.folder}/${file.path}`, file.text);
      const agent = buzzAgent(local.pubkey);
      if (agent && (agent.name !== updated.name || (agent.picture || "") !== (updated.picture || AVATAR))) {
        try {
          await ctx.agents.save(agent.key, { name: updated.name, picture: updated.picture || AVATAR });
        } catch {
          // Buzz refused (offline or mid-turn); the next sync tries again.
        }
      }
      next.push(updated);
      changed = true;
    }
    // Each agent's own memory key, after every agent is registered, so the
    // memory from before memories were per agent stays with the oldest one.
    const grants = await getMemories(next.filter((a) => a.pubkey).map((a) => a.pubkey));
    for (const [i, agent] of next.entries()) {
      const memory = agent.pubkey && grants[agent.pubkey];
      if (!memory) continue;
      await writeMemoryKey(agent.folder, memory);
      if (agent.workspace !== memory.workspace) {
        next[i] = { ...agent, workspace: memory.workspace };
        changed = true;
      }
    }
    if (changed) await saveAgents(next);
    return next;
  }

  // ── Page ─────────────────────────────────────────────────────────────

  function useBuzzAgents() {
    const [, setTick] = useState(0);
    useEffect(() => {
      try {
        return ctx.agents.subscribe(() => setTick((n) => n + 1));
      } catch {
        return undefined;
      }
    }, []);
  }

  function Progress({ at }) {
    return h(
      "ol",
      { className: "progress" },
      STEPS.map((label, i) => h("li", { key: label, className: i < at ? "done" : i === at ? "on" : "" }, `${i < at ? "✓" : i === at ? "›" : "·"}  ${label}`)),
    );
  }

  function CreateForm({ first, claude, onCreated, onCancel }) {
    const [name, setName] = useState(first ? "Kybernesis" : "");
    const [role, setRole] = useState("");
    const [focus, setFocus] = useState("");
    const [at, setAt] = useState(-1);
    const [problem, setProblem] = useState("");
    const busy = at >= 0 && at < STEPS.length;

    const submit = async (e) => {
      if (e && e.preventDefault) e.preventDefault();
      setProblem("");
      setAt(0);
      try {
        const entry = await createAgent({ name: name.trim(), role: role.trim(), focus: focus.trim() }, setAt);
        onCreated(entry);
      } catch (error) {
        setProblem(errorText(error));
        setAt(-1);
      }
    };

    return h(
      "form",
      { className: "panel", onSubmit: submit },
      h(
        "div",
        { className: "spread", style: { marginBottom: 14 } },
        h("div", { className: "title", style: { margin: 0 } }, first ? "Name your agent" : "New agent"),
        onCancel && !busy && h("button", { type: "button", className: "link", onClick: onCancel }, "Cancel"),
      ),
      h("label", { className: "f" }, h("span", null, "Name"), h("input", { value: name, maxLength: 40, disabled: busy, onChange: (e) => setName(e.target.value), placeholder: first ? "Kybernesis" : "Give it a name" })),
      h("label", { className: "f" }, h("span", null, "Role (optional)"), h("input", { value: role, maxLength: 80, disabled: busy, onChange: (e) => setRole(e.target.value), placeholder: "Marketing assistant" })),
      h(
        "label",
        { className: "f" },
        h("span", null, "What should it help with? (optional)"),
        h("textarea", { value: focus, maxLength: 1000, disabled: busy, onChange: (e) => setFocus(e.target.value), placeholder: "Keep track of my clients, draft follow-ups, remember what we decided." }),
      ),
      h("button", { type: "submit", className: `btn em${first ? " big" : ""}`, disabled: busy || !claude.ready || !name.trim() }, busy ? "Working…" : first ? "Create my agent" : "Create agent"),
      at >= 0 && h(Progress, { at }),
      problem && h("div", { className: "notice bad", style: { marginTop: 14 } }, problem),
    );
  }

  // `round` changes once the account sync has rewritten the memory key, so the
  // check never reads a key the sync is about to replace.
  function AgentCard({ agent, round, onEdit }) {
    const [memory, setMemory] = useState("checking");
    useEffect(() => {
      if (round === 0) return undefined;
      let live = true;
      setMemory("checking");
      checkMemory(agent.folder).then((r) => live && setMemory(r.ok ? "ok" : "down"));
      return () => {
        live = false;
      };
    }, [agent.folder, round]);
    const inBuzz = !!buzzAgent(agent.pubkey);
    const running = isRunning(agent.pubkey);
    const run = running ? ["ok", "Running in Buzz"] : inBuzz ? ["warn", "Stopped"] : ["", "In another community"];
    const mem = { checking: ["", "Checking memory"], ok: ["ok", "Memory on"], down: ["bad", "Memory not answering"] }[memory];
    const focus = agent.focus && agent.focus.length > 120 ? `${agent.focus.slice(0, 120)}…` : agent.focus;
    return h(
      "div",
      { className: "card" },
      h(
        "div",
        { className: "who" },
        h("img", { className: "avatar", src: agent.picture || AVATAR, alt: "" }),
        h("div", { style: { minWidth: 0 } }, h("h2", null, agent.name), h("div", { className: "role" }, agent.role || "Kybernesis agent")),
      ),
      focus ? h("p", { className: "focus" }, focus) : null,
      h(
        "div",
        { className: "foot" },
        h("div", { className: "sts" }, h("span", { className: `st ${run[0]}` }, run[1]), h("span", { className: `st ${mem[0]}` }, mem[1])),
        h("button", { type: "button", className: "link", onClick: () => onEdit(agent) }, "Edit ↗"),
      ),
    );
  }

  function Welcome({ claude, onCheck, onCreated }) {
    return h(
      "div",
      { className: "hero" },
      h(
        "div",
        null,
        h("h1", null, "Your own agent in Buzz, with a ", h("em", null, "memory that lasts"), "."),
        h("p", { className: "muted", style: { marginBottom: 24 } }, "It runs on your Claude plan, answers in your DMs and channels, and remembers the people, decisions and details that matter."),
        h(
          "div",
          { className: "panel", style: { marginBottom: 16 } },
          h("div", { className: "title" }, "Before you start"),
          h(
            "ol",
            { className: "steps" },
            h(
              "li",
              null,
              h("span", { className: "num" }, claude.ready ? "✓" : "01"),
              h(
                "div",
                null,
                h("div", null, claude.ready ? "Claude is on in Buzz." : "Turn on Claude in Buzz."),
                !claude.ready &&
                  h(
                    "div",
                    { className: "small muted", style: { marginTop: 4 } },
                    "Settings, then Agent setup, then Claude. Press Install, then Sign in with your Claude Pro or Max plan. ",
                    h("button", { type: "button", className: "link", onClick: onCheck }, "Check again"),
                  ),
              ),
            ),
            h("li", null, h("span", { className: "num" }, "02"), h("div", null, "Name your agent below and create it. It takes about ten seconds.")),
            h("li", null, h("span", { className: "num" }, "03"), h("div", null, "Open a DM with it in Buzz and say hello.")),
          ),
        ),
        h(CreateForm, { first: true, claude, onCreated }),
      ),
      h(
        "div",
        { className: "art" },
        h("img", { src: AVATAR, alt: "" }),
        h("div", { className: "label" }, "Kybernesis agent"),
        h("p", { className: "small muted", style: { margin: 0 } }, "Your Buzz identity is your account. No email, no password."),
      ),
    );
  }

  // ── Routines ─────────────────────────────────────────────────────────
  //
  // Routines live on the account (agents make them with create_routine). While
  // Buzz is open, this checks every minute and, when one is due, sends its
  // prompt to the agent in its DM as the person. Times are this Mac's local time.

  const ROUTINE_REFRESH_MS = 10 * 60 * 1000;
  const ROUTINE_GRACE_MS = 15 * 60 * 1000; // a slot missed by more than this (Buzz was closed) is skipped
  let routineCache = { at: 0, routines: {} };

  function lastSlot(r, now) {
    const [hh, mm] = r.every === "hour" ? [now.getHours(), Number(r.at.slice(1))] : r.at.split(":").map(Number);
    const slot = new Date(now);
    slot.setHours(hh, mm, 0, 0);
    if (r.every === "hour") {
      if (slot > now) slot.setHours(slot.getHours() - 1);
      return slot;
    }
    for (let i = 0; i < 8; i++) {
      const day = slot.getDay();
      const fits = r.every === "day" || (r.every === "weekday" && day >= 1 && day <= 5) || (r.every === "week" && day === r.weekday);
      if (fits && slot <= now) return slot;
      slot.setDate(slot.getDate() - 1);
    }
    return null;
  }

  async function routineRuns() {
    try {
      return JSON.parse(await readText(`${await homeDir()}/routine-runs.json`)) || {};
    } catch {
      return {};
    }
  }

  let ticking = false;
  async function tickRoutines() {
    if (ticking) return;
    ticking = true;
    try {
      const agents = (await loadAgents()).filter((a) => a.pubkey);
      if (!agents.length) return;
      const relay = ctx.relay.snapshot();
      if (relay.status !== "ready" || !relay.session) return;
      if (Date.now() - routineCache.at > ROUTINE_REFRESH_MS) {
        const s = await signIn();
        const res = await call("/api/routines", { method: "GET", token: s.token });
        if (res.status === 200 && res.json.routines) routineCache = { at: Date.now(), routines: res.json.routines };
      }
      const now = new Date();
      const runs = await routineRuns();
      let ran = false;
      for (const agent of agents) {
        for (const r of routineCache.routines[agent.pubkey] || []) {
          const slot = lastSlot(r, now);
          if (!slot || slot.getTime() < Date.parse(r.createdAt)) continue;
          const key = `${agent.pubkey}:${r.id}`;
          if ((runs[key] || 0) >= slot.getTime() || now - slot > ROUTINE_GRACE_MS) continue;
          runs[key] = slot.getTime();
          ran = true;
          try {
            const channel = await relay.session.directMessages.open([agent.pubkey]);
            relay.session.messages.send(channel, `Routine: ${r.name}\n\n${r.prompt}`, [agent.pubkey], [], undefined);
          } catch (error) {
            console.warn(`[kybernesis] routine ${r.name} didn't start: ${errorText(error)}`);
          }
        }
      }
      if (ran) await writeFile(`${await homeDir()}/routine-runs.json`, JSON.stringify(runs) + "\n");
    } catch (error) {
      console.warn(`[kybernesis] routines: ${errorText(error)}`);
    } finally {
      ticking = false;
    }
  }

  setTimeout(tickRoutines, 20 * 1000);
  setInterval(tickRoutines, 60 * 1000);

  ctx.pages.register({
    id: "home",
    title: "Kybernesis",
    primary: true,
    icon: ICON,
    component: function Home() {
      useBuzzAgents();
      const [claude, setClaude] = useState(() => claudeStatus());
      const [agents, setAgents] = useState(null);
      const [adding, setAdding] = useState(false);
      const [note, setNote] = useState(null); // { kind, text }
      const [busyAccount, setBusyAccount] = useState(false);
      const synced = useRef(false);
      const [round, setRound] = useState(0); // 0 until the account sync settles

      const refresh = async () => {
        setClaude(claudeStatus());
        const list = await loadAgents();
        setAgents(list);
        return list;
      };

      useEffect(() => {
        refresh().then((list) => {
          if (!list.length || synced.current) return;
          synced.current = true;
          sync()
            .then((next) => setAgents(next))
            .catch((error) => setNote({ kind: "bad", text: `Couldn't reach your account: ${errorText(error)}` }))
            .finally(() => setRound((n) => n + 1));
        });
      }, []);

      const account = async (to) => {
        setBusyAccount(true);
        setNote(null);
        try {
          await openAccount(to);
        } catch (error) {
          setNote({ kind: "bad", text: errorText(error) });
        } finally {
          setBusyAccount(false);
        }
      };

      const created = (entry) => {
        setAdding(false);
        setNote({ kind: "", text: `${entry.name} is ready. Open a DM with ${entry.name} in Buzz and say hello.` });
        refresh().then(() => setRound((n) => n + 1)); // create already wrote the current key
      };

      const has = agents && agents.length > 0;
      return h(
        "div",
        { className: "kyb" },
        h("style", null, CSS),
        h(
          "header",
          { className: "top" },
          h(
            "div",
            { className: "in" },
            h("span", { className: "mark" }, "//KYBERNESIS"),
            h(
              "div",
              { className: "acts" },
              h("button", { type: "button", className: "btn ghost", disabled: busyAccount, onClick: () => account("/account") }, busyAccount ? "Opening…" : "Account ↗"),
              has && !adding && h("button", { type: "button", className: "btn", onClick: () => setAdding(true) }, "+ New agent"),
            ),
          ),
        ),
        h(
          "div",
          { className: "body" },
          h(
            "div",
            { className: "in" },
            note && h("div", { className: `notice ${note.kind}`, style: { marginBottom: 16 } }, note.text),
            agents === null
              ? h("p", { className: "muted" }, "Loading…")
              : !has
                ? h(Welcome, { claude, onCheck: refresh, onCreated: created })
                : h(
                    React.Fragment,
                    null,
                    !claude.ready &&
                      h("div", { className: "notice bad", style: { marginBottom: 16 } }, `Your agents can't answer until Claude is on in Buzz: ${claude.label}`),
                    adding && h(React.Fragment, null, h(CreateForm, { first: false, claude, onCreated: created, onCancel: () => setAdding(false) }), h("div", { className: "gap" })),
                    h("div", { className: "title" }, agents.length === 1 ? "Your agent" : `Your agents · ${agents.length}`),
                    h(
                      "div",
                      { className: "grid" },
                      agents.map((a) => h(AgentCard, { key: a.folder, agent: a, round, onEdit: (agent) => account(agent.pubkey ? `/account/agents/${agent.pubkey}` : "/account") })),
                    ),
                    h("div", { className: "fine" }, "Buzz must be open for your agents to answer · Free during early access"),
                  ),
          ),
        ),
      );
    },
  });

  // ── The agent's folder ───────────────────────────────────────────────

  function agentFiles({ name, role, focus }) {
    // disableClaudeAiConnectors: the person's own claude.ai connectors would reach every agent; apps come only through the per-agent kybernesis server.
    const deny = ["~/.ssh/**", "~/.aws/**", "~/.gnupg/**", "~/.config/gh/**", "~/.netrc", "~/.npmrc", "~/Library/Keychains/**", "~/Library/Application Support/Google/Chrome/**", "**/.env", "**/.env.*"].flatMap((p) => [`Read(${p})`, `Edit(${p})`]);
    const settings = { enableAllProjectMcpServers: true, enabledMcpjsonServers: ["memory", "kybernesis"], disableClaudeAiConnectors: true, permissions: { deny } };
    return [
      { path: "CLAUDE.md", text: claudeMd(name, role, focus) },
      { path: ".claude/settings.json", text: JSON.stringify(settings, null, 2) + "\n" },
      { path: ".claude/skills/recall/SKILL.md", text: RECALL_SKILL },
      { path: ".claude/skills/remember/SKILL.md", text: REMEMBER_SKILL },
      { path: ".claude/skills/notes/SKILL.md", text: NOTES_SKILL },
      { path: ".claude/skills/cards/SKILL.md", text: CARDS_SKILL },
      { path: ".claude/skills/pages/SKILL.md", text: PAGES_SKILL },
      { path: ".claude/skills/build/SKILL.md", text: BUILD_SKILL },
      { path: ".claude/skills/ship/SKILL.md", text: SHIP_SKILL },
      { path: ".claude/skills/documents/SKILL.md", text: DOCUMENTS_SKILL },
    ];
  }

  function claudeMd(name, role, focus) {
    const about = focus ? `\n## What your owner wants help with\n\n${focus.replace(/\r/g, "")}\n` : "";
    const job = role ? `, a Kybernesis agent working as their ${role.replace(/[\r\n]+/g, " ")}` : ", a Kybernesis agent";
    return `# ${name}

You are ${name}${job}. You work in Buzz, a team chat app, for the person who created you: answer their DMs, and help in the channels they add you to. Keep replies short and plain, the way a capable colleague writes in chat.
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

## Cards

Buzz can draw your replies as cards: key numbers, charts, tables, checklists, a profile of a person or company, and buttons to press. Use the cards skill when a reply is mainly numbers, a comparison, a status or a list, and to ask before anything that can't be undone or that others will see. The \`make_card\` tool on the \`kybernesis\` server builds the exact message for you.

## Pages

For anything longer or richer than a chat reply (a report, a dashboard, a brief, a small app), make an HTML page and publish it with \`publish_page\` on the \`kybernesis\` server. It returns a private link and a message that shows the page inline in Buzz; send that message as-is. Use the pages skill. When someone asks for a report, summary, page, dashboard or write-up, this is where it goes: never Notion, Google Docs or a Buzz canvas unless they name that place.

## Routines

You can do things on a schedule with \`create_routine\` (a morning briefing, a weekly summary). Agree the name and time with the person first. When a message starts with "Routine:", it comes from one of your routines: do the task and reply in that conversation. Routines run while Buzz is open on the person's Mac.

## Connected apps

When the person connects Gmail, Google Calendar, Google Drive, Notion or Slack on their account and turns it on for you, those tools appear on the \`kybernesis\` server (named like \`gmail_...\`, \`googlecalendar_...\`). Use them to answer questions about their mail, schedule, files and workspace. Ask for small amounts (about 10 emails, one inbox or channel at a time) and open a full item only when you need it.

Before you send, reply, post, invite, share, delete or change anything in a connected app, show the person exactly what you will do (a card with buttons works well) and wait for their yes. Reading needs no permission. If an app you need isn't there, say they can connect it under Connected apps on buzz.kybernesis.ai.

## Your folder

Work inside your own folder. Never read or search the rest of the person's computer (other projects, other agents' folders, keys, passwords, browser data) unless they ask you to work on a specific file or folder; then touch only that. To learn how to do something, use your skills, not the person's files.

## Building and documents

You run on the person's Mac and can build things: websites, apps, scripts and tools (build skill), put them live after the person says yes (ship skill), and make or read Word documents, PDFs, spreadsheets and slide decks (documents skill). Keep your work inside your folder unless the person names another place, and ask before installing anything.
`;
  }

  const CARDS_SKILL = `---
description: "Send a card in Buzz instead of plain text: a few key numbers, a trend chart, a table, a checklist of progress, a short profile of a person or company, a link, or a question with buttons to press. Use when a reply is mainly numbers, a comparison, a status or a list, or when you want the person to pick from a few options or approve something before you do it."
---

# Cards

Buzz draws a card from a message that carries one in a hidden line. People without the Kybernesis cards plugin read the plain text above the line, so that text must stand on its own.

## How a card message looks

\`\`\`
Website, last 7 days: 12,480 visitors (+8%), 3.1% sign-up rate.

<!-- kyb:card v1 {"kyb":1,"card":"stats","title":"Website · last 7 days","data":{"tiles":[{"label":"Visitors","value":"12,480","change":"+8%","tone":"good"},{"label":"Sign-up rate","value":"3.1%"}]}} -->
\`\`\`

Rules:
1. First a short plain-text version of the card. Then a blank line. Then the card on ONE line: \`<!-- kyb:card v1 \` + compact JSON + \` -->\`.
2. The JSON must be valid, on one line, and must never contain two hyphens in a row (write a long dash as \`\\u2014\`). Always \`"kyb":1\`.
3. Send a card as its own message when you can, after your reply. Otherwise put it at the very end of your reply.
4. Don't repeat the card's contents in your words. One or two sentences on what matters is enough.
5. Never put passwords, keys or private details in a card. Cards are data, never HTML.

## Card types (\`card\` and its \`data\`)

- \`stats\`: \`{"tiles":[{"label","value","change"?,"tone"?}]}\`, 1 to 6 tiles. Values already formatted ("12,480", "2.5%"). \`tone\` is good, bad or neutral; up is not always good.
- \`chart\`: \`{"kind":"line"|"bar"|"area","x":["Mon","Tue",...],"series":[{"name","values":[...]}],"unit"?}\`, up to 4 series, one value per x label.
- \`table\`: \`{"columns":[{"key","label","align"?:"right"}],"rows":[{key: value}],"total"?}\`, up to 8 columns and 50 rows. Right-align numbers.
- \`checklist\`: \`{"items":[{"text","state":"done"|"waiting"|"failed"|"skipped","detail"?}]}\`, up to 20.
- \`brief\`: a person or company. \`{"name","subtitle"?,"points"?:[...],"facts"?:[{"label","value"}],"tiles"?:[...]}\`.
- \`link\`: \`{"url","title"?,"site"?,"description"?}\`, https only.

Optional on every card: \`"title"\`, \`"source"\` (where the data came from), \`"id"\` (a later card with the same id replaces this one).

## Buttons: choices and approvals

Add \`"actions":[{"label":"Send it","say":"Yes, send it","primary":true},{"label":"Change it","say":"Let me change it first"}]\`. Pressing a button sends its \`say\` text to you as the person's next message, so word it as their answer. Up to 4 buttons.

Before you do anything that can't be undone or that others will see (send an email, post somewhere, delete something, spend money), show what you will do and ask with buttons, then wait for the answer. A \`checklist\` or \`brief\` card with the details and two buttons works well.

For a page with links (a report or dashboard), use the pages skill instead.
`;

  const PAGES_SKILL = `---
description: "Make a page: a report, dashboard, brief, plan, comparison or one-page app, published to a private link and shown inline in Buzz. Use when an answer is too long or too visual for a chat message, or when someone asks for a report, dashboard, document, page or write-up they can open and share."
---

# Pages

1. Gather what goes in it first (memory, files, the web). Pages are for real content, not filler.
2. Write one complete HTML document: \`<!doctype html>\`, a \`<title>\`, inline \`<style>\`, and inline \`<script>\` only if it needs interaction. Charts can use a library from cdnjs.cloudflare.com or cdn.jsdelivr.net with an exact version. Keep it under 2 MB; no secrets, keys or passwords in it.
3. Make it readable: a clear title, the answer first, short sections, tables for numbers, and a layout that works on a phone (max-width about 760px, 16px side padding). Warm paper background #faf9f7, slate text #1e293b, emerald #059669 for accents, system fonts.
4. Call \`publish_page({ title, html })\` on the \`kybernesis\` server. Send the \`message\` it returns exactly as it is: Buzz draws it as the page, with an Open button. Add one sentence on what the page shows.
5. To change a page, call \`publish_page\` again with its \`page_id\`; the link stays the same. \`list_pages\` shows what you have published. Delete a page only when the person asks.

Anyone with the link can open the page, so don't put anything in it the person wouldn't want shared.
`;

  const BUILD_SKILL = `---
description: "Build software on this Mac: a website, app, dashboard, script or tool, from scratch or in an existing project. Use whenever writing or changing code: set up the project, run it, check it, and look at it before saying it is done."
---

# Build

You run on the person's own Mac. Their files, their accounts, their machine: act like a careful guest.

## Before you start

1. Agree what you are building in a sentence or two. If the ask is thin, take the most reasonable reading and say what you assumed.
2. Look up the project in your memory (\`arcana_recall\` on its name). An earlier decision may already settle the stack or the approach.
3. Check the tools: \`node -v\`, \`npm -v\`, \`git --version\`. If one is missing, say what is missing and how to get it (Node from nodejs.org or \`brew install node\`), and ask before installing anything.
4. New projects go in \`projects/<name>\` inside your folder unless the person names a place. Never touch files outside the project without asking.

## Default stack

A website or app: Next.js + TypeScript + Tailwind, scaffolded without prompts:

\`\`\`
npx create-next-app@latest <name> --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --yes
\`\`\`

A small script: plain Node or Python, no framework. Add a dependency only when you could defend it.

## The loop (every change)

1. Change: small, coherent edits.
2. Check: typecheck and tests (\`npm run typecheck\`, \`npm test\`, or the project's own). Never move on past red.
3. Run: start servers in the background with a log, never in the foreground (a foreground server hangs you):
   \`\`\`
   nohup npm run dev > .dev.log 2>&1 &
   curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
   \`\`\`
   Retry the curl for a few seconds until it answers 200. If the server dies, read \`.dev.log\` first. Stop the servers you started when you finish.
4. Look: take a screenshot and open it with your file reading tool, then judge the pixels.
   - With Google Chrome installed: \`"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --hide-scrollbars --window-size=1280,900 --screenshot=/tmp/shot.png http://localhost:3000\`
   - Otherwise: \`npx playwright screenshot --viewport-size=1280,900 http://localhost:3000 /tmp/shot.png\` (the first run downloads a browser; say so first).
   - Check a phone width too (390,844). Is anything clipped, overlapping or unreadable? Debug text left in? Fix and look again.

Done means: checks pass, it runs without errors, and you have looked at it at desktop and phone width. "The code looks right" is not done.

## Showing the person

Tell them where it is and how to open it (\`http://localhost:3000\` while it runs, or the folder path). For something they will look at more than once, a page (pages skill) or a card with a screenshot summary works well. Say what you ran and what passed.

## Git

- Start every new project with \`git init\` and a first commit of the clean scaffold.
- On someone's existing repo: a branch per task (\`agent/<short-name>\`), never commit straight to main, never force-push, never rewrite history.
- Commit at each green point with a message that says what and why. Check the diff for \`.env\` files, keys and passwords before every commit.
- Push or open pull requests only with the person's own git setup, and only when they asked.

## Remember the work

Save decisions and their reasons as a note (notes skill), and the project's state at the end of a session with \`arcana_remember\` ("Recipe site: search done, checkout next, in projects/recipes"). Next time you start from there.

For putting it live, use the ship skill.
`;

  const SHIP_SKILL = `---
description: "Put something you built live on the internet: a preview link first, then production only after the person says yes. Use when asked to deploy, publish, launch, release or make it live."
---

# Ship

Putting something live is visible to the world and uses the person's accounts. A preview is yours to make; production is the person's call, every time.

1. Green first: the build skill's loop has passed (checks, runs, looked at). Don't redeploy to re-check something that hasn't changed.
2. Use what the person already has. Check for a signed-in host before choosing one: \`vercel whoami\`, \`netlify status\`, or a git remote whose pushes deploy. Never create accounts, sign in for them, or ask for passwords or keys in chat. If nothing is set up, say what they would need and stop.
3. Make a preview: \`vercel\` (not \`--prod\`), or push the branch when the host builds previews from git. Find the preview link.
4. Look at the preview the way you looked at local: screenshot it at desktop and phone width. A preview can break where local worked (missing settings, build differences).
5. Ask before production with a card: what goes live, at which address, and buttons such as \`{"label":"Make it live","say":"Yes, make it live","primary":true}\` and \`{"label":"Not yet","say":"Not yet"}\`. Wait for the answer. An earlier "just ship it" does not count; the yes belongs to this moment.
6. After the yes: deploy to production (\`vercel --prod\`, or merge the way the person said), then open the live address and check it serves the new work.
7. Remember the ship with \`arcana_remember\`: what went live, when, and the addresses.

Never deploy with failing checks, never change domains, DNS or environment settings without saying exactly what will change and getting a yes, and never spend money (paid plans, domains) without the person's go-ahead.
`;

  const DOCUMENTS_SKILL = `---
description: "Make or read documents on this Mac: Word documents, PDFs, spreadsheets, slide decks, letters, proposals, invoices, CVs. Use when someone asks for a file they can open, print, attach to an email or edit, or shares a document for you to read."
---

# Documents

Files you make stay on the person's Mac. Save them in \`files/\` in your folder (make it if needed) with a clear name (\`acme-proposal-2026-11.docx\`), and tell the person the full path. Don't open windows on their screen unless they ask; if they do, \`open <path>\` opens the file and \`open -R <path>\` shows it in Finder.

If the person wants something to look at or share as a link rather than a file, a page is usually better (pages skill).

## Write the content first

Draft the whole document as clean HTML with inline CSS: a title, headings, short paragraphs, real tables for numbers. Get the words right before converting. Use memory for names, dates and details; never invent figures.

## Word (.docx)

macOS converts HTML to Word with no installs:

\`\`\`
textutil -convert docx -output files/<name>.docx /tmp/<name>.html
\`\`\`

Headings, bold, lists, tables and links carry over; keep styling simple (fonts, sizes, colours, borders). Fancy layout does not survive, so don't rely on it.

## PDF

With Google Chrome installed:

\`\`\`
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --no-pdf-header-footer --print-to-pdf=files/<name>.pdf file:///tmp/<name>.html
\`\`\`

Set the page in CSS: \`@page { size: A4; margin: 18mm }\` (or \`size: letter\` in the US). Use \`break-before: page\` for new pages. Without Chrome, make the Word file, or publish a page and tell the person they can print it to PDF.

Check every PDF you make: open it with your file reading tool and look at the pages.

## Spreadsheets

A \`.csv\` opens in Numbers and Excel and is the safe default: one header row, plain numbers (no currency signs inside numbers; say the currency in the header), dates as YYYY-MM-DD. Quote any value containing a comma.

For formatting, formulas or several sheets, check \`python3 -c "import openpyxl"\`. If that works, write an \`.xlsx\` with openpyxl. If not, make the CSV and say formatting needs a library you can install with their OK (\`pip3 install --user openpyxl\`).

## Slide decks

Default: a deck as an HTML page, one \`<section>\` per slide at 16:9, arrow keys to move, published with the pages skill. For a file, print the same HTML to PDF with \`@page { size: 1280px 720px; margin: 0 }\` and one slide per page. For PowerPoint, check \`python3 -c "import pptx"\` and use python-pptx if it is there; otherwise offer the PDF.

A good slide has one idea, a headline that says the point, and few words. Numbers go in a chart or a big figure.

## Reading documents

- PDFs and images: open them with your file reading tool.
- Word, RTF, Pages exports: \`textutil -convert txt -stdout <file>\`.
- CSV: read it directly. Excel: \`python3\` with openpyxl if available, otherwise ask for a CSV export.

Summarise what matters, and save key facts or a note to memory when the document is something you will need again.

Never put passwords, bank details or ID numbers in a document unless the person gave them for exactly that document.
`;

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
