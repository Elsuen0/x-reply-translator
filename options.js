const { UI_LANG, LANGUAGES, t, languageLabel } = self.XRT;

const DEFAULTS = { apiKey: "", model: "claude-haiku-5-5", tone: "casual", targetLang: "en", learn: true };

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

async function load() {
  const s = await chrome.storage.local.get(DEFAULTS);
  $("apiKey").value = s.apiKey;
  $("targetLang").value = s.targetLang;
  $("model").value = s.model;
  $("tone").value = s.tone;
  $("learn").checked = s.learn;
}

async function save() {
  const apiKey = $("apiKey").value.trim();
  await chrome.storage.local.set({
    apiKey,
    targetLang: $("targetLang").value,
    model: $("model").value,
    tone: $("tone").value,
    learn: $("learn").checked,
  });
  const status = $("status");
  status.textContent = apiKey ? t("saved") : t("savedNoKey");
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

async function clearHistory() {
  if (!confirm(t("clearConfirm"))) return;
  await chrome.storage.local.remove("history");
  renderHistory();
}

// ---------- Init ----------

applyTexts();
$("save").addEventListener("click", save);
$("export").addEventListener("click", exportHistory);
$("clear").addEventListener("click", clearHistory);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.history) renderHistory();
});

load();
renderHistory();
