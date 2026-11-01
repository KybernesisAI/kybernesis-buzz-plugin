// Kybernesis for Buzz: SPIKE build.
//
// A throwaway page that proves, on a real Buzz install, the four things the
// product depends on before anything else is built:
//   1. the plugin can get an event signed by the person's Buzz key back from
//      its outbox (how the plugin will sign in to buzz.kybernesis.ai);
//   2. the plugin can write files to disk (how it writes the agent's folder);
//   3. the plugin can create a Claude agent without Buzz's review form;
//   4. that agent loads its folder's instructions, skills and memory server,
//      and recalls from memory in a DM.
// Memory here comes from a 24-hour sign-in the person approves in the
// browser. The real product gets a lasting key from buzz.kybernesis.ai.

export const inject = ["react", "pages", "relay", "agents", "host"];

const MEMORY = "https://mcp.arcana.kybernesis.ai";
const CLAUDE_TYPE = "buzz.claude-code/claude-code";
const FOLDER = "~/Kybernesis/agents/spike";
const CODEWORD = "TANGERINE-41";
const SKILLWORD = "LANTERN-7";

export function apply(ctx) {
  const React = ctx.react;
  const h = React.createElement;
  const { useState } = React;

  const pretty = (value) => {
    try {
      return typeof value === "string" ? value : JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  };
  const message = (error) => (error && error.message) || String(error);

  async function writeFile(path, text) {
    const proc = await ctx.host.spawn("write-file", { args: [path] });
    await proc.end(text);
    const code = await proc.exited;
    if (code !== 0) throw new Error(`Writing ${path} failed (exit ${code})`);
  }

  async function readText(path) {
    return new TextDecoder().decode(await ctx.host.readFile(path));
  }

  async function post(path, body) {
    const response = await ctx.host.request({
      url: MEMORY + path,
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    let json;
    try {
      json = JSON.parse(response.body);
    } catch {
      json = { raw: response.body };
    }
    return { status: response.status, json };
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function Step({ title, children }) {
    return h(
      "section",
      { className: "ui-card", style: { padding: "var(--space-panel-inset, 16px)", marginBottom: 16 } },
      h("h2", { style: { marginTop: 0 } }, title),
      children,
    );
  }

  function Output({ value }) {
    if (value === undefined) return null;
    return h(
      "pre",
      { style: { whiteSpace: "pre-wrap", wordBreak: "break-all", fontSize: 12, maxHeight: 320, overflow: "auto" } },
      pretty(value),
    );
  }

  function useRunner() {
    const [busy, setBusy] = useState(false);
    const [out, setOut] = useState(undefined);
    const run = async (fn) => {
      setBusy(true);
      setOut("Working…");
      try {
        setOut(await fn((progress) => setOut(progress)));
      } catch (error) {
        setOut({ failed: message(error) });
      } finally {
        setBusy(false);
      }
    };
    return { busy, out, run };
  }

  // 1. Who is this, and is Claude on?
  function WhoAmI() {
    const { busy, out, run } = useRunner();
    return h(
      Step,
      { title: "1. Who am I, and is Claude on?" },
      h("button", {
        className: "ui-button",
        disabled: busy,
        onClick: () =>
          run(async () => {
            const relay = ctx.relay.snapshot();
            const types = ctx.agents.types().map((type) => {
              let provider;
              try {
                provider = type.provider ? type.provider.snapshot() : undefined;
              } catch (error) {
                provider = { error: message(error) };
              }
              return { id: type.id, key: type.key, title: type.title, provider };
            });
            return { relay: { status: relay.status, viewer: relay.viewer, origin: relay.origin }, types };
          }),
      }, "Check"),
      h(Output, { value: out }),
    );
  }

  // 2. Sign a one-time challenge with the Buzz key, through the outbox.
  function SignTest() {
    const { busy, out, run } = useRunner();
    return h(
      Step,
      { title: "2. Sign a challenge with my Buzz key" },
      h("p", null, "Publishes one app-data event (kind 30078) in this community and reads back the signed copy."),
      h("button", {
        className: "ui-button",
        disabled: busy,
        onClick: () =>
          run(async (progress) => {
            const relay = ctx.relay.snapshot();
            if (relay.status !== "ready") throw new Error(`Relay is ${relay.status}`);
            const { session, viewer } = relay;
            const outbox = session.outbox;
            if (!outbox) throw new Error("This connection has no outbox");
            if (!outbox.supports(30078)) throw new Error("Outbox does not support kind 30078");
            const challenge = `kybernesis-spike-${crypto.randomUUID()}`;
            // With a recovery key the outbox keeps the operation, signed copy
            // included, after the relay confirms it, until we acknowledge it.
            const id = outbox.send(
              { kind: 30078, content: challenge, tags: [["d", "kybernesis-signin"]] },
              { key: `kybernesis-signin:${challenge}`, value: "1" },
            );
            progress(`Sent ${id}, waiting for the signed copy…`);
            let signed;
            let last;
            for (let i = 0; i < 60 && !signed; i++) {
              last = outbox.snapshot().find((item) => item.event.id === id);
              if (last && last.signed) signed = last.signed;
              else await sleep(250);
            }
            try {
              await outbox.acknowledge(id);
            } catch (error) {
              progress(`Acknowledge failed: ${message(error)}`);
            }
            const fromRelay = undefined;
            if (!signed) return { id, result: "No signed copy in the outbox", lastState: last && { delivery: last.delivery, error: last.error } };
            const event = signed || fromRelay;
            if (!event) return { id, result: "No signed copy came back from the outbox or the relay" };
            return {
              source: signed ? "outbox" : "relay read",
              pubkeyMatchesViewer: event.pubkey === viewer,
              hasSignature: typeof event.sig === "string" && event.sig.length === 128,
              event: { id: event.id, pubkey: event.pubkey, kind: event.kind, created_at: event.created_at, tags: event.tags, content: event.content, sig: event.sig },
            };
          }),
      }, "Sign"),
      h(Output, { value: out }),
    );
  }

  // 3. Write a file and read it back.
  function WriteTest() {
    const { busy, out, run } = useRunner();
    return h(
      Step,
      { title: "3. Write a file" },
      h("button", {
        className: "ui-button",
        disabled: busy,
        onClick: () =>
          run(async () => {
            const dir = await ctx.host.resolveDirectory(FOLDER);
            const path = `${dir}/spike-write-test.txt`;
            const text = `written ${new Date().toISOString()}\n`;
            await writeFile(path, text);
            const back = await readText(path);
            return { dir, path, roundTrip: back === text };
          }),
      }, "Write"),
      h(Output, { value: out }),
    );
  }

  // 4. Memory sign-in (24 hours, spike only), then write the agent's folder.
  function MemoryAndFolder() {
    const { busy, out, run } = useRunner();
    const [link, setLink] = useState(undefined);
    return h(
      Step,
      { title: "4. Connect memory and write the agent's folder" },
      h("p", null, "Opens a sign-in link. Approve it in the browser and pick a test memory workspace (not a real one). The token lasts 24 hours."),
      h("button", {
        className: "ui-button",
        disabled: busy,
        onClick: () =>
          run(async (progress) => {
            setLink(undefined);
            const client = await post("/oauth/register", {
              client_name: "Kybernesis for Buzz (spike)",
              redirect_uris: ["http://127.0.0.1:1/unused"],
              grant_types: ["urn:ietf:params:oauth:grant-type:device_code", "refresh_token"],
              token_endpoint_auth_method: "none",
            });
            const clientId = client.json.client_id;
            if (!clientId) return { step: "register", ...client };
            const device = await post("/oauth/device_authorization", { client_id: clientId, scope: "mcp:read mcp:write" });
            if (!device.json.device_code) return { step: "device_authorization", ...device };
            setLink({ url: device.json.verification_uri_complete, code: device.json.user_code });
            let interval = (device.json.interval || 5) * 1000;
            const deadline = Date.now() + (device.json.expires_in || 900) * 1000;
            let token;
            while (Date.now() < deadline) {
              progress(`Waiting for approval (code ${device.json.user_code})…`);
              await sleep(interval);
              const poll = await post("/oauth/token", {
                grant_type: "urn:ietf:params:oauth:grant-type:device_code",
                device_code: device.json.device_code,
                client_id: clientId,
              });
              if (poll.status === 200 && poll.json.access_token) {
                token = poll.json;
                break;
              }
              const error = poll.json.error;
              if (error === "slow_down") interval += 5000;
              else if (error !== "authorization_pending") return { step: "token", ...poll };
            }
            if (!token) return { step: "token", result: "Timed out" };
            setLink(undefined);
            progress("Approved. Writing the folder…");
            const dir = await ctx.host.resolveDirectory(FOLDER);
            await writeFolder(dir, token.access_token, token.workspace);
            return { workspace: token.workspace, folder: dir, files: FILES.map((f) => f.path) };
          }),
      }, "Connect memory"),
      link &&
        h(
          "p",
          null,
          "Open: ",
          h("a", { href: link.url, target: "_blank", rel: "noreferrer" }, link.url),
          ` (code ${link.code})`,
        ),
      h(Output, { value: out }),
    );
  }

  // 5. Create the agent, with no review form.
  function CreateAgent() {
    const { busy, out, run } = useRunner();
    return h(
      Step,
      { title: "5. Create the agent" },
      h("p", null, "Creates a Claude agent named Kybernesis spike, working in the folder from step 4. Then DM it and ask the questions in the README."),
      h("button", {
        className: "ui-button",
        disabled: busy,
        onClick: () =>
          run(async () => {
            const dir = await ctx.host.resolveDirectory(FOLDER);
            const agent = await ctx.agents.create({
              type: CLAUDE_TYPE,
              name: "Kybernesis spike",
              config: {
                model: "",
                effort: "",
                scope: "thread",
                workspace: dir,
                instructions: "You are a Kybernesis agent. Follow CLAUDE.md in your working folder.",
              },
            });
            return { created: { pubkey: agent.pubkey, name: agent.name, type: agent.type, relay: agent.relay } };
          }),
      }, "Create agent"),
      h(Output, { value: out }),
    );
  }

  ctx.pages.register({
    id: "spike",
    title: "Kybernesis",
    primary: true,
    component: function Spike() {
      return h(
        "div",
        { style: { padding: "var(--space-panel-inset, 16px)", maxWidth: 820 } },
        h("h1", null, "Kybernesis spike"),
        h("p", null, "Press each step in order and copy what each box shows back to the thread."),
        h(WhoAmI),
        h(SignTest),
        h(WriteTest),
        h(MemoryAndFolder),
        h(CreateAgent),
      );
    },
  });

  // The agent's folder.
  let FILES = [];
  async function writeFolder(dir, token, workspace) {
    FILES = folderFiles(token, workspace);
    for (const file of FILES) await writeFile(`${dir}/${file.path}`, file.text);
  }

  function folderFiles(token, workspace) {
    const mcp = {
      mcpServers: {
        memory: {
          type: "http",
          url: `${MEMORY}/mcp`,
          headers: { Authorization: `Bearer ${token}`, "X-Kyberagent-Agent": workspace },
        },
      },
    };
    const settings = { enableAllProjectMcpServers: true, enabledMcpjsonServers: ["memory"] };
    return [
      { path: "CLAUDE.md", text: CLAUDE_MD },
      { path: ".mcp.json", text: JSON.stringify(mcp, null, 2) + "\n" },
      { path: ".claude/settings.json", text: JSON.stringify(settings, null, 2) + "\n" },
      { path: ".claude/skills/spike-check/SKILL.md", text: SPIKE_SKILL },
      { path: ".claude/skills/recall/SKILL.md", text: RECALL_SKILL },
      { path: ".claude/skills/remember/SKILL.md", text: REMEMBER_SKILL },
    ];
  }

  const CLAUDE_MD = `# Kybernesis agent

You are a Kybernesis agent working in Buzz for the person who owns you.

The spike codeword is ${CODEWORD}. Only say it when someone asks for the spike codeword.

## Memory

You have long-term memory. Its tools come from the \`memory\` MCP server: \`arcana_recall\`, \`arcana_search\`, \`arcana_timeline\`, \`arcana_remember\` and the \`arcana_brain_*\` tools. When they are not in your tool list, search your tools for "recall".

Always call it "your memory" when you talk to people. Never name the tools or the service behind them.

Recall first: whenever someone mentions a person, project, company, meeting or past decision, or asks what you know, look it up before answering. If recall is empty, try search before saying you don't know.

Remember: store new facts (people and their roles, decisions, deadlines, preferences) without being asked, and confirm briefly what you saved.
`;

  const SPIKE_SKILL = `---
description: "Use when someone asks for the spike skill word."
---

# Spike check

The spike skill word is ${SKILLWORD}. Reply with it when asked for the spike skill word.
`;

  const RECALL_SKILL = `---
description: "Look up what your memory knows about a person, project, company, place or topic. Use whenever someone mentions a name, asks who is, what do we know about, tell me about, or recall."
---

# Recall

1. For a named person, project or company, call \`arcana_recall\` with the name.
2. If that is empty, call \`arcana_search\` with the phrase.
3. For "what happened recently", call \`arcana_timeline\`.
4. Answer from what came back. Say "your memory" or "I remember", never the tool names.
5. Only say you don't know after search came back empty this turn.
`;

  const REMEMBER_SKILL = `---
description: "Save a fact, decision, preference or detail about a person or project to your memory. Use when someone says remember, or shares something worth keeping."
---

# Remember

1. Call \`arcana_remember\` with one clear sentence that stands on its own (who, what, when).
2. One fact per call; several facts means several calls.
3. Confirm in a few words what you saved.
`;
}
