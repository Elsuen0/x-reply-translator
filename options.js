const { UI_LANG, LANGUAGES, t, languageLabel } = self.XRT;

const DEFAULTS = {
  provider: "anthropic",
  apiKey: "",
  model: "claude-haiku-5-5",
  openaiKey: "",
  openaiModel: "gpt-4o-mini",
  tone: "casual",
  targetLang: "en",
  learn: true,
};

const HISTORY_MAX = 500;

const $ = (id) => document.getElementById(id);

// ---------- Texts ----------
// innerHTML only for our own strings from i18n.js (they contain <kbd> and a link), never for user data

function applyTexts() {
  document.documentElement.lang = UI_LANG;
  document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
  document.querySelectorAll("[data-i18n-html]").forEach((el) => (el.innerHTML = t(el.dataset.i18nHtml)));

  const select = $("targetLang");
  select.replaceChildren(
    ...LANGUAGES.map((l) => {
      const o = document.createElement("option");
      o.value = l.code;
      const label = languageLabel(l.code);
      o.textContent = label.charAt(0).toUpperCase() + label.slice(1);
      return o;
    })
  );
}

// ---------- Settings ----------

// Show only the fields of the selected provider
function showProviderFields() {
  const openai = $("provider").value === "openai";
  $("anthropicFields").hidden = openai;
  $("openaiFields").hidden = !openai;
}

async function load() {
  const s = await chrome.storage.local.get(DEFAULTS);
  $("provider").value = s.provider;
  $("apiKey").value = s.apiKey;
  $("model").value = s.model;
  $("openaiKey").value = s.openaiKey;
  $("openaiModel").value = s.openaiModel;
  $("targetLang").value = s.targetLang;
  $("tone").value = s.tone;
  $("learn").checked = s.learn;
  showProviderFields();
}

async function save() {
  const provider = $("provider").value;
  const apiKey = $("apiKey").value.trim();
  const openaiKey = $("openaiKey").value.trim();
  await chrome.storage.local.set({
    provider,
    apiKey,
    model: $("model").value,
    openaiKey,
    openaiModel: $("openaiModel").value.trim() || DEFAULTS.openaiModel,
    targetLang: $("targetLang").value,
    tone: $("tone").value,
    learn: $("learn").checked,
  });
  const status = $("status");
  status.textContent = (provider === "openai" ? openaiKey : apiKey) ? t("saved") : t("savedNoKey");
  setTimeout(() => (status.textContent = ""), 2000);
}

// ---------- History ----------

async function getHistory() {
  const { history } = await chrome.storage.local.get({ history: [] });
  return Array.isArray(history) ? history : [];
}

function renderEntry(e) {
  const li = document.createElement("li");

  const src = document.createElement("p");
  src.className = "fr";
  src.textContent = e.src ?? e.fr ?? "";

  const out = document.createElement("p");
  out.className = "en";
  out.textContent = e.final;

  const meta = document.createElement("p");
  meta.className = "meta";
  const tags = [
    new Date(e.ts).toLocaleDateString(UI_LANG, { day: "numeric", month: "short" }),
    `→ ${(e.target ?? "en").toUpperCase()}`,
  ];
  if (e.edited) tags.push(t("tagEdited"));
  if (e.posted) tags.push(t("tagPosted"));
  meta.textContent = tags.join(" · ");

  li.append(src, out, meta);
  return li;
}

async function renderHistory() {
  const history = await getHistory();
  const done = history.filter((e) => e.final);
  const edited = done.filter((e) => e.edited).length;
  const posted = done.filter((e) => e.posted).length;

  $("stats").textContent = done.length
    ? t("historyStats", { done: done.length, edited, posted })
    : t("historyEmpty");

  $("recent").replaceChildren(...done.slice(-5).reverse().map(renderEntry));

  $("export").disabled = $("clear").disabled = history.length === 0;
}

async function exportHistory() {
  const history = await getHistory();
  const blob = new Blob([JSON.stringify(history, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `x-reply-translator-history-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Keep only the fields we know, as plain strings/numbers, so a hand-edited or foreign file can't inject junk
function cleanEntry(e) {
  if (!e || typeof e !== "object") return null;
  const str = (v) => (typeof v === "string" ? v : "");
  const src = str(e.src) || str(e.fr);
  const final = str(e.final);
  if (!e.id || typeof e.id !== "string" || !src || !final) return null;
  const out = {
    id: e.id,
    ts: Number.isFinite(e.ts) ? e.ts : Date.now(),
    src,
    target: str(e.target) || "en",
    context: str(e.context).slice(0, 280),
    ai: str(e.ai) || final,
    final,
    edited: !!e.edited,
  };
  if (e.posted) out.posted = true;
  if (e.action === "copy" || e.action === "replace") out.action = e.action;
  if (Number.isFinite(e.regenerated)) out.regenerated = e.regenerated;
  return out;
}

async function importHistory(file) {
  const msg = $("historyMsg");
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data)) throw new Error("not an array");
    const incoming = data.map(cleanEntry).filter(Boolean);
    if (!incoming.length) throw new Error("no valid entries");
    const current = await getHistory();
    const known = new Set(current.map((e) => e.id));
    const fresh = incoming.filter((e) => !known.has(e.id));
    const merged = [...current, ...fresh].sort((a, b) => (a.ts || 0) - (b.ts || 0)).slice(-HISTORY_MAX);
    await chrome.storage.local.set({ history: merged });
    msg.textContent = fresh.length ? t("importDone", { n: fresh.length }) : t("importNothing");
  } catch (_) {
    msg.textContent = t("importError");
  }
  setTimeout(() => (msg.textContent = ""), 5000);
}

async function clearHistory() {
  if (!confirm(t("clearConfirm"))) return;
  await chrome.storage.local.remove("history");
  renderHistory();
}

// ---------- Init ----------

applyTexts();
$("provider").addEventListener("change", showProviderFields);
$("save").addEventListener("click", save);
$("export").addEventListener("click", exportHistory);
$("import").addEventListener("click", () => $("importFile").click());
$("importFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  e.target.value = ""; // allows picking the same file again
  if (file) importHistory(file);
});
$("clear").addEventListener("click", clearHistory);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.history) renderHistory();
});

load();
renderHistory();
