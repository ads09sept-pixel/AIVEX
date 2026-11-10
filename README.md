# AIVEX — One AI. Endless Possibilities.

A deployable React + Netlify starter for your AIVEX AI assistant.

## What works in this starter

- Real AI responses through the Google AI Studio / Gemini API, called securely from a Netlify Function.
- Conversation context (the most recent 16 messages are sent to the model).
- Optional Google Search grounding for a request when the user switches on **Web search**.
- Image input (up to 4 images, 8 MB each).
- Text, Markdown and CSV file attachment.
- Browser-local chat history and chat search.
- Light/dark theme.
- Browser speech-to-text (where supported) and read-aloud.
- Responsive mobile and desktop layout.
- Clearly marked ad placement areas and optional Google AdSense integration hooks.

## Important limitations (read before publishing)

This is a functional starter, not a finished clone of ChatGPT and not a newly trained foundation model. AIVEX's intelligence comes from the configured AI provider and model. Model quality, speed, context limits, availability and cost are controlled by that provider.

Not implemented yet: accounts / cloud sync, true persistent AI memory, PDF/DOCX parsing, live two-way voice conversation, image generation/editing, advanced data-analysis sandbox, folders, admin ad manager, rate limiting, abuse protection and production analytics. Do not advertise these as working until they are added and tested.

## 1. Get the project running locally

Install Node.js (LTS), then in this folder:

```bash
npm install
npm run dev
```

## 2. Connect the AI

1. Create an API key in Google AI Studio.
2. In Netlify, open **Site configuration → Environment variables**.
3. Add `GEMINI_API_KEY` with your secret key.
4. Optional: add `GEMINI_MODEL` (default: `gemini-2.5-flash`).
5. Optional: set `ENABLE_GOOGLE_SEARCH` to `true`.
6. Deploy / trigger a fresh deploy after setting the variables.

The key is used only by `netlify/functions/chat.mjs`. Never add it to `src/`, `VITE_*` variables, or a public Git repository.

## 3. Deploy to Netlify

### Recommended: Git deploy
1. Upload this folder to a private GitHub repository.
2. In Netlify choose **Add new site → Import an existing project**.
3. Select the repository.
4. Build command: `npm run build`
5. Publish directory: `dist`
6. Netlify should detect `netlify/functions`.
7. Add the environment variables above and deploy.

### Manual deploy
Netlify's drag-and-drop deploy for a static `dist` folder does **not** deploy the source Netlify Functions or build the app. Run `npm install` and `npm run build` locally, then use Netlify CLI (`npx netlify deploy --build`) or connect a Git repository so functions are deployed too.

## 4. Advertising / monetization

There are ad placement placeholders in the sidebar and welcome screen. To use Google AdSense:

1. First publish a complete website with privacy policy, contact/about information and original useful content.
2. Apply to AdSense and wait for approval. Approval is not guaranteed.
3. After approval, configure the publisher/client ID and ad slot ID in the `AdSlot` component. The client ID may be supplied as `VITE_ADSENSE_CLIENT` at build time; replace the sample slot ID in `src/App.jsx` with your approved slot.
4. Follow the ad network's policies, consent/privacy requirements and invalid-traffic rules. Never click your own ads or ask others to click them.

**Age / account note:** AdSense publishers generally need to be 18 or older. If the site owner is under 18, a parent or legal guardian must own and manage the eligible AdSense account under Google's rules. Do not enter a false date of birth or bypass age checks. Check current provider terms before applying.

## Security before public launch

This starter is suitable for testing, not unrestricted public traffic. Before opening it to everyone:
- Add authentication or sensible per-IP/user rate limits to protect your AI quota.
- Add abuse prevention, request size limits, monitoring and budget alerts.
- Add a real privacy policy describing what is sent to the AI provider and how data is stored.
- Restrict CORS to your production domain.
- Consider that browser-local chats are not encrypted cloud storage and can be lost when browser data is cleared.
- Do not collect sensitive personal information unless you have a proper security and privacy design.

## Environment variables

| Variable | Required | Purpose |
|---|---:|---|
| `GEMINI_API_KEY` | Yes | Secret Google AI Studio API key |
| `GEMINI_MODEL` | No | Model ID; defaults to `gemini-2.5-flash` |
| `ENABLE_GOOGLE_SEARCH` | No | Allows Google Search tool when true |

## Project structure

```text
AIVEX/
├── index.html
├── package.json
├── netlify.toml
├── .env.example
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   └── styles.css
└── netlify/
    └── functions/
        └── chat.mjs
```
