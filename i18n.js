// Shared strings + language list. Loaded by the content script, the options page and the service worker.
// UI language follows the browser: French if the browser is in French, English otherwise.

(() => {
  const UI_LANG = (self.navigator?.language || "en").toLowerCase().startsWith("fr") ? "fr" : "en";

  // Languages you can post in. `name` is used in the prompt and the English UI, `fr` in the French UI.
  const LANGUAGES = [
    { code: "en", name: "English", fr: "anglais" },
    { code: "fr", name: "French", fr: "français" },
    { code: "es", name: "Spanish", fr: "espagnol" },
    { code: "pt", name: "Portuguese", fr: "portugais" },
    { code: "de", name: "German", fr: "allemand" },
    { code: "it", name: "Italian", fr: "italien" },
    { code: "nl", name: "Dutch", fr: "néerlandais" },
    { code: "ja", name: "Japanese", fr: "japonais" },
  ];

  const STRINGS = {
    en: {
      // Panel on X
      pill: "Translate → {code}",
      pillTitle: "Translate to {lang} (Alt+T)",
      panelTitle: "{lang} version",
      close: "Close (Esc)",
      regenerate: "Regenerate",
      copy: "Copy",
      copied: "Copied ✓",
      replace: "Replace",
      hint: "You can edit the text before replacing. Enter = Replace · Esc = Close",
      loading: "Translating…",
      styleExamples: "Style: {n} personal example(s)",
      openSettings: "Open settings",
      errEmpty: "Write your reply in the box first.",
      errReloaded: "The extension was reloaded: refresh the X page.",
      errUnknown: "Unknown error.",
      errEditorGone: "The reply box is no longer open.",
      errReplace: "X didn't accept the automatic replacement. The translation is copied: click in the box, Ctrl+A then Ctrl+V.",
      errNoKey: "No API key yet. Open the extension settings to add yours.",
      errApi: "API error: {detail}",
      errEmptyResponse: "Empty response from the API.",

      // Settings page
      subtitle: "Write your reply on X in any language, press <kbd>Alt</kbd>+<kbd>T</kbd> (or the Translate button).",
      provider: "AI provider",
      providerHelp: "Use whichever API key you already have.",
      providerClaude: "Claude (Anthropic)",
      providerOpenAI: "OpenAI",
      apiKey: "Claude API key",
      apiKeyHelp: "Create one at <a href=\"https://console.anthropic.com/settings/keys\" target=\"_blank\" rel=\"noopener\">console.anthropic.com</a> and pick a workspace in “Scope”. Stored only in this browser.",
      openaiKey: "OpenAI API key",
      openaiKeyHelp: "Create one at <a href=\"https://platform.openai.com/api-keys\" target=\"_blank\" rel=\"noopener\">platform.openai.com</a>. Stored only in this browser.",
      openaiModel: "OpenAI model",
      openaiModelHelp: "Any chat model your key can use. A small, cheap one is plenty for replies.",
      targetLang: "Post in",
      targetLangHelp: "Your draft's language is detected automatically.",
      model: "Model",
      modelHaiku: "Claude Haiku 5.5 — fast, cheap (recommended)",
      modelSonnet: "Claude Sonnet 5.5 — more nuanced",
      tone: "Tone",
      toneCasual: "Casual (X style)",
      toneNeutral: "Neutral",
      tonePro: "Professional but friendly",
      learn: "Learn from my replies",
      learnHelp: "Your latest final versions (especially the ones you edited) are sent to Claude as examples of your style.",
      save: "Save",
      saved: "Saved ✓",
      savedNoKey: "Saved (no API key)",
      historyTitle: "Your history",
      historyEmpty: "Nothing yet. Use the extension on X and your replies will show up here.",
      historyStats: "{done} translation(s) kept, {edited} edited by you, {posted} posted.",
      tagEdited: "edited by you",
      tagPosted: "posted",
      export: "Export (JSON)",
      import: "Import (JSON)",
      importDone: "{n} new entries imported.",
      importNothing: "Nothing new to import.",
      importError: "Invalid file: pick a history exported from this extension.",
      clear: "Clear",
      clearConfirm: "Clear the whole history? Export it first if you want to keep it.",
    },

    fr: {
      pill: "Traduire → {code}",
      pillTitle: "Traduire en {lang} (Alt+T)",
      panelTitle: "Version en {lang}",
      close: "Fermer (Échap)",
      regenerate: "Régénérer",
      copy: "Copier",
      copied: "Copié ✓",
      replace: "Remplacer",
      hint: "Tu peux modifier le texte avant de remplacer. Entrée = Remplacer · Échap = Fermer",
      loading: "Traduction en cours…",
      styleExamples: "Style : {n} exemple(s) perso",
      openSettings: "Ouvrir les réglages",
      errEmpty: "Écris d'abord ta réponse dans le champ.",
      errReloaded: "L'extension a été rechargée : rafraîchis la page X.",
      errUnknown: "Erreur inconnue.",
      errEditorGone: "Le champ de réponse n'est plus ouvert.",
      errReplace: "X n'a pas accepté le remplacement automatique. La traduction est copiée : clique dans le champ, Ctrl+A puis Ctrl+V.",
      errNoKey: "Aucune clé API. Ouvre les réglages de l'extension pour l'ajouter.",
      errApi: "Erreur API : {detail}",
      errEmptyResponse: "Réponse vide de l'API.",

      subtitle: "Écris ta réponse sur X dans n'importe quelle langue, appuie sur <kbd>Alt</kbd>+<kbd>T</kbd> (ou le bouton Traduire).",
      provider: "Fournisseur d'IA",
      providerHelp: "Utilise la clé API que tu as déjà.",
      providerClaude: "Claude (Anthropic)",
      providerOpenAI: "OpenAI",
      apiKey: "Clé API Claude",
      apiKeyHelp: "À créer sur <a href=\"https://console.anthropic.com/settings/keys\" target=\"_blank\" rel=\"noopener\">console.anthropic.com</a>, en choisissant un workspace dans « Portée ». Stockée uniquement dans ce navigateur.",
      openaiKey: "Clé API OpenAI",
      openaiKeyHelp: "À créer sur <a href=\"https://platform.openai.com/api-keys\" target=\"_blank\" rel=\"noopener\">platform.openai.com</a>. Stockée uniquement dans ce navigateur.",
      openaiModel: "Modèle OpenAI",
      openaiModelHelp: "N'importe quel modèle de chat accessible avec ta clé. Un petit modèle pas cher suffit largement pour des réponses.",
      targetLang: "Publier en",
      targetLangHelp: "La langue de ton brouillon est détectée automatiquement.",
      model: "Modèle",
      modelHaiku: "Claude Haiku 5.5 — rapide, pas cher (recommandé)",
      modelSonnet: "Claude Sonnet 5.5 — plus fin",
      tone: "Ton",
      toneCasual: "Décontracté (style X)",
      toneNeutral: "Neutre",
      tonePro: "Pro mais amical",
      learn: "Apprendre de mes réponses",
      learnHelp: "Tes dernières versions finales (surtout celles que tu as corrigées) sont envoyées à Claude comme exemples de ton style.",
      save: "Enregistrer",
      saved: "Enregistré ✓",
      savedNoKey: "Enregistré (pas de clé API)",
      historyTitle: "Ton historique",
      historyEmpty: "Rien pour l'instant. Utilise l'extension sur X, tes réponses apparaîtront ici.",
      historyStats: "{done} traduction(s) gardée(s), dont {edited} corrigée(s) par toi et {posted} postée(s).",
      tagEdited: "corrigé par toi",
      tagPosted: "posté",
      export: "Exporter (JSON)",
      import: "Importer (JSON)",
      importDone: "{n} nouvelle(s) entrée(s) importée(s).",
      importNothing: "Rien de nouveau à importer.",
      importError: "Fichier invalide : choisis un historique exporté depuis cette extension.",
      clear: "Effacer",
      clearConfirm: "Effacer tout l'historique ? Exporte-le d'abord si tu veux le garder.",
    },
  };

  function t(key, vars = {}) {
    const s = STRINGS[UI_LANG][key] ?? STRINGS.en[key] ?? key;
    return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
  }

  function language(code) {
    return LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];
  }

  // Language name as shown in the UI
  function languageLabel(code) {
    const l = language(code);
    return UI_LANG === "fr" ? l.fr : l.name;
  }

  self.XRT = { UI_LANG, LANGUAGES, t, language, languageLabel };
})();
