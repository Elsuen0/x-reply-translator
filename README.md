# X Reply Translator — beta (v0.5)

Write your X replies in your own language. Press **Alt+T** and get a natural translation that sounds like you, ready to post.

The more you use it, the more it writes like you: every time you edit a translation before posting, it learns from your edits.

> Beta: built in public, feedback welcome. Source is readable so you can check that your API key only ever goes to the provider you chose (Anthropic or OpenAI). All rights reserved, see `LICENSE`.

---

## 1. Install (2 minutes)

Works in Chrome and any Chromium browser (Opera, Edge, Brave), on desktop.

1. On this page, click the green **Code** button → **Download ZIP**, then unzip it. You get a folder (`x-reply-translator-main`). Keep it somewhere it won't be deleted: the browser loads the extension from it.
2. Go to `chrome://extensions` (Opera: `opera://extensions`, Edge: `edge://extensions`).
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the unzipped folder (the one that directly contains `manifest.json`).
5. Pin the extension to your toolbar (puzzle icon → pin).

The browser may warn you about developer-mode extensions: that's normal for anything not installed from the Web Store.

## 2. Add your API key (Claude or OpenAI)

The extension uses your own API key, so your usage and your data stay on your account. **Already have an OpenAI key? Use it:** open the extension settings, set **AI provider** to OpenAI, paste your key and save. Otherwise, create a Claude key:

1. Go to [console.anthropic.com](https://console.anthropic.com) and create an account if needed.
2. Add a few dollars of credit (**$5 lasts months**: one translation costs a fraction of a cent with the default model).
3. Go to **API keys → Create key**. Name it `x-reply-translator`, and **pick a workspace in “Scope”** (otherwise you'll get a workspace error).
4. Copy the key, click the extension icon, paste it, choose the language you want to post in, then **Save**.
5. Refresh x.com.

Tip: set a low monthly spend limit in the console for peace of mind.

## 3. Use it

1. Open a post and click **Reply**.
2. Write your reply in your own language.
3. Press **Alt+T** (or click the **Translate → EN** button above the box).
4. Read the translation. You can edit it right in the panel.
5. **Enter** or **Replace** puts it in the reply box. **Regenerate** gives another version. **Esc** closes.
6. Review and post yourself. The extension never posts anything for you.

## 4. How it learns your style

Each time you keep a translation (Replace or Copy), the extension saves locally: your draft, the suggested translation and the version you actually kept or posted. On the next translations, your latest versions (edited ones first) are sent to your chosen AI provider as style examples.

So **edit freely** when something doesn't sound like you: that's what makes it better. You can turn learning off, see your history, export it, import it on another computer, or clear it in the settings.

## 5. Privacy

- Your API key, settings and history are stored only in your browser (`chrome.storage.local`).
- On each translation, the extension sends to the API of the provider you picked (Anthropic or OpenAI): your draft, the text of the post you're replying to, and up to 8 of your past replies as style examples. Nothing is sent anywhere else, and nothing goes to me.

## 6. What I'd love feedback on

- Does it keep your tone, or does it sound like a generic translation?
- How often do you edit the translation before posting, and what do you change?
- Anything confusing during install or setup?
- Did anything break (wrong text in the box, button in a weird place, errors)?

Send it to me on X ([@lucascprt_dev](https://x.com/lucascprt_dev)) or [open an issue](../../issues).

## Known limitations

- Desktop browsers only (no mobile app).
- OpenAI support is new. If you hit an error with your OpenAI model, try `gpt-4o-mini` and tell me what happened.
- X changes its page structure regularly. If the button disappears or Replace stops working, tell me and use **Copy** in the meantime.
- If Alt+T conflicts with a browser shortcut, use the button.

---

© 2026 Lucas Capart. All rights reserved. See `LICENSE`.
