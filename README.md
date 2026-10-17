# X Reply Translator — beta (v0.3)

Write your X replies in your own language. Press **Alt+T** and get a natural translation that sounds like you, ready to post.

The more you use it, the more it writes like you: every time you edit a translation before posting, it learns from your edits.

> Beta build, shared privately for testing. Please don't redistribute it.

---

## 1. Install (2 minutes)

Works in Chrome and any Chromium browser (Opera, Edge, Brave), on desktop.

1. Unzip the file. You get a folder called `x-reply-translator`. Keep it somewhere it won't be deleted: the browser loads the extension from it.
2. Go to `chrome://extensions` (Opera: `opera://extensions`, Edge: `edge://extensions`).
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the `x-reply-translator` folder.
5. Pin the extension to your toolbar (puzzle icon → pin).

The browser may warn you about developer-mode extensions: that's normal for anything not installed from the Web Store.

## 2. Add your Claude API key

The extension uses your own Claude API key, so your usage and your data stay on your account.

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

Each time you keep a translation (Replace or Copy), the extension saves locally: your draft, the suggested translation and the version you actually kept or posted. On the next translations, your latest versions (edited ones first) are sent to Claude as style examples.

So **edit freely** when something doesn't sound like you: that's what makes it better. You can turn learning off, see your history, export it or clear it in the settings.

## 5. Privacy

- Your API key, settings and history are stored only in your browser (`chrome.storage.local`).
- On each translation, the extension sends to Anthropic's API: your draft, the text of the post you're replying to, and up to 8 of your past replies as style examples. Nothing is sent anywhere else, and nothing goes to me.

## 6. What I'd love feedback on

- Does it keep your tone, or does it sound like a generic translation?
- How often do you edit the translation before posting, and what do you change?
- Anything confusing during install or setup?
- Did anything break (wrong text in the box, button in a weird place, errors)?

## Known limitations

- Desktop browsers only (no mobile app).
- X changes its page structure regularly. If the button disappears or Replace stops working, tell me and use **Copy** in the meantime.
- If Alt+T conflicts with a browser shortcut, use the button.

---

© 2026 Lucas Capart. All rights reserved. See `LICENSE`.
