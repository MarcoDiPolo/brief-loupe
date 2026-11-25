# Brief Loupe

Freelancers need to know what a client will accept, when the work is due and when they will be paid. Brief Loupe turns an English or French job brief into an evidence sheet. Each proposed term links to an actual source line. Missing terms stay visible as questions for the client. The app never sends a proposal or accepts a job.

Try the manual worksheet in your browser. [Open Brief Loupe](https://marcodipolo.github.io/brief-loupe/)

## Try the app

Use Node.js 24 or newer.

```sh
npm ci
npm start
```

Open the loopback address printed by the server. The bookshop brief is fictional. Choose its fourth line, select **Pay and expenses** and click **Attach line**. The fee appears in its original wording. You can edit the evidence sheet and download it as plain text. Editing the source clears earlier references. The text and the worksheet live in the tab until you export or close it.

## Run Firebase AI Logic

1. In a dedicated Firebase project on the Spark plan, enable Firebase AI Logic using the Gemini Developer API. Register a Web app and configure App Check with reCAPTCHA v3 for your site. Development can use a registered App Check debug token on localhost. Keep the debug token private. [Firebase hybrid setup](https://firebase.google.com/docs/ai-logic/hybrid/web/get-started) · [Firebase App Check for web](https://firebase.google.com/docs/app-check/web/recaptcha-provider)
2. Put a file named `firebase-config.json` alongside `package.json`. Copy the public Firebase web configuration and the **public** App Check site key into the fields shown below. The local server serves this file from the project root. For a hosted build, supply it separately alongside the generated `index.html`. Never place a Gemini API key, an App Check debug token, a private reCAPTCHA key or a service-account file in that configuration.

```json
{
  "firebase": {
    "apiKey": "FIREBASE_WEB_API_KEY",
    "projectId": "FIREBASE_PROJECT_ID",
    "appId": "FIREBASE_WEB_APP_ID"
  },
  "recaptchaSiteKey": "RECAPTCHA_PUBLIC_SITE_KEY",
  "cloudModel": "gemini-3.5-flash-lite",
  "cloudEnabled": false
}
```

3. Use desktop Chrome 139 or later on supported hardware. Follow the current Firebase setup for Chrome's Prompt API. When the model is downloadable, the app shows a download button with its multi-gigabyte data requirement. Wait for it to finish before trying on-device inference. [Platform and model requirements](https://developer.chrome.com/docs/ai/get-started)
4. Click **Find cited terms**. With the default setting, the app checks local model availability before calling the Firebase SDK with `InferenceMode.ONLY_ON_DEVICE`. If the local model is unavailable, you can continue manually. For an authorized private development run, the operator can set `cloudEnabled` to `true`. The user must also explicitly select the second processing option. This calls `InferenceMode.PREFER_ON_DEVICE` and can send the brief to Google. Use public or fictional briefs when cloud processing is enabled. The evidence sheet reports the SDK's actual `response.inferenceSource`.

The SDK sends a single text prompt. A model can only propose line numbers for the four evidence categories. The app rejects invalid indices and displays the input text verbatim. Humans can remove a wrongly classified line or attach a missed one. Different document layouts may need line breaks before analysis.

The web configuration is excluded from version control. App Check and API key restrictions for the production domain must be configured separately. Personal development on an unbilled Spark project can use the Gemini Developer API free tier. Google requires Paid Services when making API clients available to users in the EEA, Switzerland or the UK. A public Spark build intended for worldwide use should keep cloud inference unconfigured and offer the manual workflow, or distribute the source and let developers test with their own project. Providing a paid cloud service or region-limited access to others requires a separate deployment design. [Firebase AI Logic pricing](https://firebase.google.com/docs/ai-logic/pricing) · [Gemini API terms](https://aistudio.google.com/docs/terms#use-restrictions)

## Build and verification

The GitHub Pages build at the project path `/brief-loupe/` provides the manual worksheet. Its publishing workflow includes only the HTML, bundled JavaScript and stylesheet. Firebase configuration is supplied separately for the full local developer build.

```sh
npm test
npm run build
node browser.test.mjs
```

The browser test uses installed Chrome or the Chromium executable specified by `CHROME_HEADLESS_SHELL_PATH`. It exercises a real local web page. It checks manual evidence editing, French input, text export, narrow layout, invalid model references, and the missing-model and missing-configuration paths. The integration checks run the Firebase JS SDK through both routes with a test model and intercepted HTTP responses. They check the App Check header and which backend is reported. No real Gemini response was obtained in these tests.

The November 25 test browser reported its on-device model as downloadable. Completing a live test needs an installed compatible model and a configured Firebase web app. For a contest demo, run both routes using the fictional sample, a supported local Chrome and a browser without the model. Capture the resulting evidence and backend label from each. [Competition rules and submission requirements](https://firebasehybridaihackathon.devpost.com/rules)

## Development

Brief Loupe was created during the contest period with Codex assistance. The interface, evidence workflow, indexing instructions and tests were created for this project. Runtime dependencies include the official Firebase JavaScript SDK. The build and tests use esbuild and Playwright Core. Third-party packages retain their own licenses.
