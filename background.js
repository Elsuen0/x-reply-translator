// Service worker: calls the Claude API and keeps the local history used to learn your style.

importScripts("i18n.js");
const { t, language } = self.XRT;

const DEFAULTS = {
  apiKey: "",
  model: "claude-haiku-5-5",
  tone: "casual",
  targetLang: "en",
  learn: true, // use your past replies as style examples
};

const HISTORY_MAX = 500;  // max entries kept locally
const EXAMPLES_MAX = 8;   // max examples sent to Claude
const EXAMPLE_CHARS = 400;

const TONES = {
  casual: "casual and conversational, like a native speaker chatting on X (contractions and everyday phrasing welcome, no stiffness)",
  neutral: "neutral and clear, natural but not slangy",
  pro: "professional yet friendly, like a founder or senior dev replying publicly",
};

// ---------- History ----------

async function getHistory() {
  const { history } = await chrome.storage.local.get({ history: [] });
  return Array.isArray(history) ? history : [];
}

async function writeEntry(entry) {
  const history = await getHistory();
  const i = history.findIndex((e) => e.id === entry.id);
  if (i >= 0) history[i] = { ...history[i], ...entry };
  else history.push(entry);
  if (history.length > HISTORY_MAX) history.splice(0, history.length - HISTORY_MAX);
  await chrome.storage.local.set({ history });
}

// Queue so two saves at the same time don't overwrite each other
let saveQueue = Promise.resolve();
function saveEntry(entry) {
  saveQueue = saveQueue.then(() => writeEntry(entry)).catch((err) => console.error("[XRT] save", err));
  return saveQueue;
}

// Draft text of an entry (`fr` = field name used before v0.3)
const draftOf = (e) => e.src ?? e.fr ?? "";

// Same target language only. Your edits first (strongest signal), then translations kept as-is.
function pickExamples(history, targetLang) {
  const done = history
    .filter((e) => draftOf(e) && e.final && (e.target ?? "en") === targetLang)
    .reverse();
  const edited = done.filter((e) => e.edited);
  const accepted = done.filter((e) => !e.edited);
  return [...edited, ...accepted].slice(0, EXAMPLES_MAX);
}

const clip = (s, n) => (s.length > n ? s.slice(0, n) + "…" : s);

// ---------- Prompt ----------

function buildSystemPrompt(tone, targetLang, examples) {
  const target = language(targetLang).name;
  const lines = [
    `You translate replies written for X (Twitter) into natural, native-sounding ${target}.`,
    "The draft can be in any language: detect it yourself.",
    `Tone: ${TONES[tone] || TONES.casual}.`,
    "Rules:",
    "- Keep the author's meaning, intent and opinion. Do not add new ideas, facts, or arguments.",
    "- Keep roughly the same length. Stay concise: it's an X reply.",
    "- Keep @mentions, URLs, numbers, emojis and hashtags exactly as written. Don't add emojis or hashtags.",
    `- If the draft is already in ${target}, don't translate it: just polish it so it sounds natural.`,
    "- Use the original post only as context to pick the right words; never answer it yourself.",
    `- Output ONLY the final ${target} reply text. No quotes, no notes, no explanations.`,
  ];

  if (examples.length) {
    lines.push(
      "",
      `Below are past replies from the same author: their draft and the ${target} version they actually kept, often after editing it themselves.`,
      "The kept versions are the author's real voice. Match their word choice, phrasing habits, punctuation and level of casualness.",
      "Use them for style only: never reuse their content.",
      "<style_examples>"
    );
    for (const e of examples) {
      lines.push(
        "<example>",
        `<draft>${clip(draftOf(e), EXAMPLE_CHARS)}</draft>`,
        `<author_version>${clip(e.final, EXAMPLE_CHARS)}</author_version>`,
        "</example>"
      );
    }
    lines.push("</style_examples>");
  }

  return lines.join("\n");
}

function buildUserMessage(text, context) {
  let msg = "";
  if (context) msg += `<original_post>\n${context}\n</original_post>\n\n`;
  msg += `<my_draft_reply>\n${text}\n</my_draft_reply>`;
  return msg;
}

// ---------- Translation ----------

class TranslateError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

async function translate({ text, context }) {
  const settings = await chrome.storage.local.get(DEFAULTS);
  if (!settings.apiKey) throw new TranslateError(t("errNoKey"), "no_key");

  const examples = settings.learn ? pickExamples(await getHistory(), settings.targetLang) : [];

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": settings.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: settings.model,
      max_tokens: 600,
      system: buildSystemPrompt(settings.tone, settings.targetLang, examples),
      messages: [{ role: "user", content: buildUserMessage(text, context) }],
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data?.error?.message || `HTTP ${res.status}`;
    throw new TranslateError(t("errApi", { detail }), res.status === 401 ? "no_key" : "api");
  }

  const out = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  if (!out) throw new TranslateError(t("errEmptyResponse"), "api");
  return { translation: out, examplesUsed: examples.length, target: settings.targetLang };
}

// ---------- Messages ----------

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "translate") {
    translate(msg)
      .then((r) => sendResponse({ ok: true, ...r }))
      .catch((err) => sendResponse({ ok: false, error: err.message, code: err.code || "api" }));
    return true; // async response
  }
  if (msg?.type === "historySave" && msg.entry?.id) {
    saveEntry(msg.entry).then(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg?.type === "openOptions") {
    chrome.runtime.openOptionsPage();
  }
});
