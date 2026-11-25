# Brief Loupe

Freelancers need to know what a client will accept, when the work is due and when they will be paid. Brief Loupe turns an English or French job brief into an evidence sheet. Each proposed term links to an actual source line. Missing terms stay visible as questions for the client. The app never sends a proposal or accepts a job.

Open the fictional bookshop brief in your browser. The public worksheet is free and needs no account. With a compatible desktop Chrome and a ready Gemini Nano model, **Find cited terms** runs Firebase AI Logic on your device. The public page does not send the brief to a server. Any browser can attach a line manually and export the result. [Open Brief Loupe on Firebase Hosting](https://brief-loupe.web.app/)

## For the jury

Open the Firebase Hosting link above in current desktop Chrome on eligible hardware. Choose **Find cited terms** when the model is ready. If Chrome offers the model, choose **Download on-device model** and allow several gigabytes for its first installation. The evidence sheet shows **Firebase AI Logic · on this device** after a successful generation. Check the quoted pay condition against line 4 of the bookshop brief. Change the last line, run it again, or remove and attach individual citations.

If Chrome does not expose its text model, Firebase's setup guide describes `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`, browser restart and supported hardware. A manual review works immediately on other browsers. A second free page runs Chrome's Prompt API directly and labels its source separately. [Chrome and Firebase setup](https://firebase.google.com/docs/ai-logic/hybrid/web/get-started) · [Alternate Chrome demo](https://marcodipolo.github.io/brief-loupe/)

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

The web configuration is excluded from version control. Personal development on an unbilled Spark project can use the Gemini Developer API free tier. Google requires Paid Services when making API clients available to users in the EEA, Switzerland or the UK. The public demo therefore runs entirely on the device. The separate developer build can demonstrate cloud fallback with an appropriately configured project. [Firebase AI Logic pricing](https://firebase.google.com/docs/ai-logic/pricing) · [Gemini API terms](https://aistudio.google.com/docs/terms#use-restrictions)

## Build and verification

The GitHub Pages build at `/brief-loupe/` calls Chrome’s Prompt API directly. Its output is labeled **Chrome Gemini Nano · on this device**. Its publishing workflow includes only HTML, bundled JavaScript and CSS. The developer build uses Firebase AI Logic for both inference routes and reports the SDK's actual processing location. To serve a copy of the keyless public page on your own computer, run `node build.mjs --public --serve` after `npm ci`.

```sh
npm test
npm run build
node browser.test.mjs
```

The browser test uses installed Chrome or the Chromium executable specified by `CHROME_HEADLESS_SHELL_PATH`. It exercises a real local web page. It checks manual evidence editing, French input, text export, narrow layout, invalid model references, and the missing-model and missing-configuration paths. The integration checks run the Firebase JS SDK through both routes with a test model and intercepted HTTP responses. They check the App Check header and which backend is reported. No real Gemini response was obtained in these tests.

In separate live developer runs on November 25, 2026, Firebase App Check accepted the requests and the Gemini cloud model returned evidence for two fictional briefs. In English it cited line 4 for the €80 fee and line 3 for the Friday deadline. In French it cited the 60-euro fee and the Friday cutoff in the original wording. The app reported **Firebase AI Logic · in Google’s cloud** in both runs. [Competition rules and submission requirements](https://firebasehybridaihackathon.devpost.com/rules)

## Development

Brief Loupe was created during the contest period with Codex assistance. The interface, evidence workflow, indexing instructions and tests were created for this project. Runtime dependencies include the official Firebase JavaScript SDK. The build and tests use esbuild and Playwright Core. Third-party packages retain their own licenses.
