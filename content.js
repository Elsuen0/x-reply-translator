// Content script: hooks into X's reply box, adds the Translate button, the Alt+T shortcut and the preview panel.

(() => {
  const { t, languageLabel } = self.XRT;
  const EDITOR_SEL = '[data-testid^="tweetTextarea_"][contenteditable="true"]';
  const TWEET_SEL = 'article[data-testid="tweet"]';
  const TWEET_TEXT_SEL = '[data-testid="tweetText"]';
  const POST_BTN_SEL = '[data-testid="tweetButton"], [data-testid="tweetButtonInline"]';
  const MAX_CHARS = 280;

  let activeEditor = null;
  let lastTranslation = "";
  let targetLang = "en";

  // Style learning: the translation in progress, and the one waiting to be posted
  let currentEntry = null;  // { id, ts, src, target, context, ai, editor }
  let pendingPost = null;   // { entry, editor }

  // ---------- UI (Shadow DOM pour ne pas subir le CSS de X) ----------
  const host = document.createElement("div");
  host.id = "xrt-host";
  host.style.cssText = "position:fixed;top:0;left:0;z-index:2147483647;";
  const root = host.attachShadow({ mode: "open" });

  root.innerHTML = `
    <style>
      :host { all: initial; }
      * { box-sizing: border-box; font-family: -apple-system, "Segoe UI", Roboto, sans-serif; }
      .pill {
        position: fixed; display: none;
        padding: 4px 10px; border-radius: 999px; border: 1px solid #2f3336;
        background: #16181c; color: #e7e9ea; font-size: 12px; font-weight: 600;
        cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,.35);
      }
      .pill:hover { background: #1d9bf0; border-color: #1d9bf0; color: #fff; }
      .panel {
        position: fixed; display: none; width: 360px; max-width: calc(100vw - 32px);
        background: #16181c; color: #e7e9ea; border: 1px solid #2f3336; border-radius: 14px;
        box-shadow: 0 8px 28px rgba(0,0,0,.5); padding: 12px; font-size: 14px;
      }
      .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
      .title { font-size: 12px; color: #71767b; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
      .x { background: none; border: 0; color: #71767b; font-size: 18px; cursor: pointer; line-height: 1; }
      .out {
        white-space: pre-wrap; line-height: 1.4; min-height: 40px; outline: none;
        padding: 8px; border-radius: 8px; background: #000; border: 1px solid #2f3336;
      }
      .out:focus { border-color: #1d9bf0; }
      .meta { display: flex; justify-content: space-between; margin-top: 6px; font-size: 12px; color: #71767b; }
      .meta .over { color: #f4212e; }
      .err { color: #f4212e; font-size: 13px; }
      .actions { display: flex; gap: 8px; margin-top: 10px; justify-content: flex-end; }
      button.b {
        border-radius: 999px; padding: 6px 14px; font-size: 13px; font-weight: 700; cursor: pointer;
        border: 1px solid #536471; background: transparent; color: #e7e9ea;
      }
      button.b.primary { background: #e7e9ea; color: #0f1419; border-color: #e7e9ea; }
      button.b:disabled { opacity: .5; cursor: default; }
      .hint { font-size: 11px; color: #71767b; margin-top: 8px; }
      .spin { color: #71767b; font-style: italic; }
    </style>
    <button class="pill"></button>
    <div class="panel" role="dialog">
      <div class="head">
        <span class="title"></span>
        <button class="x">×</button>
      </div>
      <div class="body"></div>
      <div class="meta"><span class="count"></span><span class="model"></span></div>
      <div class="actions">
        <button class="b retry"></button>
        <button class="b copy"></button>
        <button class="b primary replace"></button>
      </div>
      <div class="hint"></div>
    </div>
  `;

  const pill = root.querySelector(".pill");
  const panel = root.querySelector(".panel");
  const titleEl = root.querySelector(".title");
  const body = root.querySelector(".body");
  const countEl = root.querySelector(".count");
  const styleEl = root.querySelector(".model");
  const btnClose = root.querySelector(".x");
  const btnRetry = root.querySelector(".retry");
  const btnCopy = root.querySelector(".copy");
  const btnReplace = root.querySelector(".replace");

  // Static texts (UI language) + texts that depend on the target language
  btnClose.title = t("close");
  btnRetry.textContent = t("regenerate");
  btnCopy.textContent = t("copy");
  btnReplace.textContent = t("replace");
  root.querySelector(".hint").textContent = t("hint");

  function applyTarget(code) {
    targetLang = code || "en";
    const lang = languageLabel(targetLang);
    pill.textContent = t("pill", { code: targetLang.toUpperCase() });
    pill.title = t("pillTitle", { lang });
    titleEl.textContent = t("panelTitle", { lang });
    panel.setAttribute("aria-label", titleEl.textContent);
  }

  applyTarget("en");
  chrome.storage.local.get({ targetLang: "en" }).then((s) => applyTarget(s.targetLang)).catch(() => {});
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.targetLang) applyTarget(changes.targetLang.newValue);
  });

  function mount() {
    if (!document.body.contains(host)) document.body.appendChild(host);
  }

  // ---------- Helpers éditeur ----------
  function getEditorText(editor) {
    return (editor.innerText || "").replace(/\u200B/g, "").trim();
  }

  function getContextFor(editor) {
    // Le post auquel on répond = le dernier tweet qui précède l'éditeur dans le DOM
    const scope = editor.closest('[role="dialog"]') || document;
    const tweets = [...scope.querySelectorAll(TWEET_SEL)];
    let ctx = null;
    for (const t of tweets) {
      if (t.compareDocumentPosition(editor) & Node.DOCUMENT_POSITION_FOLLOWING) ctx = t;
    }
    const textEl = ctx?.querySelector(TWEET_TEXT_SEL);
    return textEl ? textEl.innerText.trim().slice(0, 2000) : "";
  }

  // ---------- Remplacement du texte ----------
  // L'éditeur de X (Draft.js) garde le texte dans son propre état : ce qui est posté, c'est cet état,
  // pas ce qui est affiché. Il faut donc passer par un collage que Draft.js traite lui-même,
  // sinon l'affichage et l'état divergent (texte en double, français publié en douce).

  const norm = (s) => s.replace(/\u200B/g, "").replace(/\s+/g, " ").trim();
  const tick = (ms) => new Promise((r) => setTimeout(r, ms));

  // Sélectionne tout le texte en posant la sélection sur les nœuds texte eux-mêmes,
  // pour que Draft.js puisse la traduire dans son état
  function selectAllIn(editor) {
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let first = null;
    let last = null;
    let node;
    while ((node = walker.nextNode())) {
      if (!first) first = node;
      last = node;
    }
    const range = document.createRange();
    if (first) {
      range.setStart(first, 0);
      range.setEnd(last, last.length);
    } else {
      range.selectNodeContents(editor);
    }
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function pasteInto(editor, text) {
    const dt = new DataTransfer();
    dt.setData("text/plain", text);
    editor.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  }

  // Renvoie true si le champ contient exactement la traduction, false sinon (jamais de double collage)
  async function replaceEditorText(editor, text) {
    const target = norm(text);
    const before = norm(getEditorText(editor));

    editor.focus();
    selectAllIn(editor);
    await tick(40); // laisser Draft.js enregistrer la sélection
    pasteInto(editor, text);
    await tick(40);
    if (norm(getEditorText(editor)) === target) return true;

    // Seulement si le collage a été complètement ignoré (rien n'a bougé) : une autre tentative
    if (norm(getEditorText(editor)) === before) {
      selectAllIn(editor);
      await tick(40);
      document.execCommand("insertText", false, text);
      await tick(40);
      if (norm(getEditorText(editor)) === target) return true;
    }
    return false;
  }

  // ---------- Historique (apprentissage du style) ----------
  function saveHistory(entry, final, extra = {}) {
    const { editor, ...data } = entry; // l'élément DOM ne se stocke pas
    const record = {
      ...data,
      final,
      edited: final.trim() !== data.ai.trim(),
      ...extra,
    };
    try {
      chrome.runtime.sendMessage({ type: "historySave", entry: record }).catch(() => {});
    } catch (_) {
      // extension rechargée : on ignore, ce n'est pas bloquant
    }
  }

  // Appelé juste avant que X poste : on enregistre le texte réellement publié
  function capturePosted() {
    if (!pendingPost) return;
    const { entry, editor } = pendingPost;
    pendingPost = null;
    if (!document.contains(editor)) return;
    const text = getEditorText(editor);
    if (text) saveHistory(entry, text, { posted: true });
  }

  // ---------- Positionnement ----------
  function positionPill() {
    if (!activeEditor || !document.contains(activeEditor)) {
      pill.style.display = "none";
      return;
    }
    const r = activeEditor.getBoundingClientRect();
    if (r.width === 0) { pill.style.display = "none"; return; }
    pill.style.display = "block";
    const pw = pill.offsetWidth || 110;
    pill.style.top = `${Math.max(8, r.top - 30)}px`;
    pill.style.left = `${Math.max(8, Math.min(window.innerWidth - pw - 8, r.right - pw))}px`;
  }

  function positionPanel() {
    if (!activeEditor) return;
    const r = activeEditor.getBoundingClientRect();
    const w = Math.min(360, window.innerWidth - 32);
    let left = Math.min(Math.max(16, r.left), window.innerWidth - w - 16);
    let top = r.bottom + 10;
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.display = "block";
    // Si ça dépasse en bas, on le met au-dessus
    const ph = panel.getBoundingClientRect().height;
    if (top + ph > window.innerHeight - 8) {
      panel.style.top = `${Math.max(8, r.top - ph - 10)}px`;
    }
  }

  // ---------- Panneau ----------
  function updateCount() {
    const out = body.querySelector(".out");
    if (!out) { countEl.textContent = ""; return; }
    const n = [...out.innerText.trim()].length;
    countEl.textContent = `${n}/${MAX_CHARS}`;
    countEl.className = "count" + (n > MAX_CHARS ? " over" : "");
  }

  function setButtons(enabled) {
    btnCopy.disabled = btnReplace.disabled = !enabled;
  }

  function showLoading() {
    body.innerHTML = "";
    const spin = document.createElement("div");
    spin.className = "spin";
    spin.textContent = t("loading");
    body.appendChild(spin);
    countEl.textContent = "";
    styleEl.textContent = "";
    setButtons(false);
    btnRetry.disabled = true;
    positionPanel();
  }

  function showResult(text, examplesUsed = 0) {
    lastTranslation = text;
    styleEl.textContent = examplesUsed ? t("styleExamples", { n: examplesUsed }) : "";
    body.innerHTML = "";
    const out = document.createElement("div");
    out.className = "out";
    out.contentEditable = "true";
    out.textContent = text;
    out.addEventListener("input", updateCount);
    body.appendChild(out);
    updateCount();
    setButtons(true);
    btnRetry.disabled = false;
    positionPanel();
    btnReplace.focus();
  }

  function showError(message, code) {
    body.innerHTML = "";
    styleEl.textContent = "";
    const e = document.createElement("div");
    e.className = "err";
    e.textContent = message;
    body.appendChild(e);
    if (code === "no_key") {
      const link = document.createElement("button");
      link.className = "b";
      link.style.marginTop = "8px";
      link.textContent = t("openSettings");
      link.onclick = () => chrome.runtime.sendMessage({ type: "openOptions" });
      body.appendChild(link);
    }
    setButtons(false);
    btnRetry.disabled = false;
    positionPanel();
  }

  function closePanel() {
    panel.style.display = "none";
    if (activeEditor && document.contains(activeEditor)) activeEditor.focus();
  }

  async function runTranslation() {
    if (!activeEditor) return;
    const text = getEditorText(activeEditor);
    if (!text) {
      mount();
      showError(t("errEmpty"));
      return;
    }
    const editor = activeEditor;
    const context = getContextFor(editor);
    mount();
    showLoading();
    try {
      const res = await chrome.runtime.sendMessage({ type: "translate", text, context });
      if (res?.ok) {
        // Same text, same box, same target = "Regenerate": keep the same entry
        if (currentEntry && currentEntry.editor === editor && currentEntry.src === text && currentEntry.target === res.target) {
          currentEntry.ai = res.translation;
          currentEntry.regenerated = (currentEntry.regenerated || 0) + 1;
        } else {
          currentEntry = {
            id: crypto.randomUUID(),
            ts: Date.now(),
            src: text,
            target: res.target,
            context: context.slice(0, 280),
            ai: res.translation,
            editor,
          };
        }
        showResult(res.translation, res.examplesUsed);
      } else {
        showError(res?.error || t("errUnknown"), res?.code);
      }
    } catch (err) {
      showError(t("errReloaded"));
    }
  }

  function currentOutputText() {
    const out = body.querySelector(".out");
    return out ? out.innerText.trim() : lastTranslation;
  }

  // ---------- Événements ----------
  pill.addEventListener("mousedown", (e) => e.preventDefault()); // garde le focus dans l'éditeur
  pill.addEventListener("click", runTranslation);
  btnClose.addEventListener("click", closePanel);
  btnRetry.addEventListener("click", runTranslation);

  btnCopy.addEventListener("click", async () => {
    const text = currentOutputText();
    await navigator.clipboard.writeText(text);
    if (currentEntry) {
      saveHistory(currentEntry, text, { action: "copy" });
      pendingPost = { entry: currentEntry, editor: currentEntry.editor };
    }
    btnCopy.textContent = t("copied");
    setTimeout(() => (btnCopy.textContent = t("copy")), 1200);
  });

  let replacing = false;
  btnReplace.addEventListener("click", async () => {
    if (replacing) return; // évite un double déclenchement (double clic, Entrée + clic)
    if (!activeEditor || !document.contains(activeEditor)) {
      showError(t("errEditorGone"));
      return;
    }
    const editor = activeEditor;
    const text = currentOutputText();
    const entry = currentEntry;

    replacing = true;
    setButtons(false);
    const ok = await replaceEditorText(editor, text);
    replacing = false;

    if (ok) {
      panel.style.display = "none";
      if (entry) saveHistory(entry, text, { action: "replace" });
    } else {
      // On ne force rien : la traduction part dans le presse-papiers, collage manuel
      await navigator.clipboard.writeText(text).catch(() => {});
      showError(t("errReplace"));
      if (entry) saveHistory(entry, text, { action: "copy" });
    }

    if (entry) {
      pendingPost = { entry, editor };
      currentEntry = null; // la prochaine traduction sera une nouvelle entrée
    }
  });

  // Détection du post (clic sur « Répondre/Poster » ou Ctrl+Entrée), en phase de capture,
  // donc avant que X ne vide le champ
  document.addEventListener("click", (e) => {
    if (e.target.closest?.(POST_BTN_SEL)) capturePosted();
  }, true);

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && e.target.closest?.(EDITOR_SEL)) {
      capturePosted();
    }
  }, true);

  panel.addEventListener("keydown", (e) => {
    e.stopPropagation(); // éviter que les raccourcis de X ne se déclenchent
    if (e.key === "Escape") { e.preventDefault(); closePanel(); }
    if (e.key === "Enter" && !e.shiftKey && e.target === btnReplace) {
      e.preventDefault();
      btnReplace.click();
    }
  });

  // Suivre l'éditeur actif
  document.addEventListener("focusin", (e) => {
    const ed = e.target.closest?.(EDITOR_SEL);
    if (ed) {
      activeEditor = ed;
      mount();
      positionPill();
    }
  }, true);

  // Raccourci Alt+T dans l'éditeur
  document.addEventListener("keydown", (e) => {
    if (!e.altKey || e.ctrlKey || e.metaKey || e.code !== "KeyT") return;
    const ed = e.target.closest?.(EDITOR_SEL);
    if (!ed) return;
    e.preventDefault();
    e.stopPropagation();
    activeEditor = ed;
    runTranslation();
  }, true);

  // Repositionnement (scroll, resize, modales qui s'ouvrent/se ferment)
  window.addEventListener("scroll", () => { positionPill(); if (panel.style.display === "block") positionPanel(); }, true);
  window.addEventListener("resize", () => { positionPill(); if (panel.style.display === "block") positionPanel(); });
  let rafPending = false;
  new MutationObserver(() => {
    if (rafPending) return; // X mute beaucoup le DOM : on limite à 1 calcul par frame
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      if (activeEditor && !document.contains(activeEditor)) {
        activeEditor = null;
        pill.style.display = "none";
        panel.style.display = "none";
      } else {
        positionPill();
      }
    });
  }).observe(document.body, { childList: true, subtree: true });
})();
