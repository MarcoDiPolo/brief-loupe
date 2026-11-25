import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode, InferenceSource } from "firebase/ai";
import { decodeReview, modelPrompt } from "./review.mjs";

let settings;
let ai;
async function initialize() {
  if (ai) return;
  const response = await fetch("./firebase-config.json", { cache: "no-store" });
  if (!response.ok) throw new Error("This installation needs its Firebase web configuration. You can review the brief manually.");
  settings = await response.json();
  if (!settings.firebase?.apiKey || !settings.firebase?.projectId || !settings.firebase?.appId || !settings.recaptchaSiteKey) {
    throw new Error("The Firebase web configuration is missing its project, app, API key or App Check site key.");
  }
  const app = initializeApp(settings.firebase);
  initializeAppCheck(app, { provider: new ReCaptchaV3Provider(settings.recaptchaSiteKey), isTokenAutoRefreshEnabled: false });
  ai = getAI(app, { backend: new GoogleAIBackend() });
}

export async function inspectWithFirebase(lines, allowCloud) {
  if (!allowCloud) {
    const device = globalThis.LanguageModel;
    if (!device || typeof device.availability !== "function" || typeof device.create !== "function") {
      throw new Error("This browser has no on-device model. Use desktop Chrome with Gemini Nano enabled, review manually, or choose cloud fallback.");
    }
    if (await device.availability() !== "available") {
      throw new Error("The on-device model is not ready. Finish the Gemini Nano download in desktop Chrome or review manually.");
    }
  }
  await initialize();
  if (allowCloud && settings.cloudEnabled !== true) {
    throw new Error("The operator has not enabled cloud fallback on this installation. Choose on-device processing or attach the evidence manually.");
  }
  const model = getGenerativeModel(ai, {
    mode: allowCloud ? InferenceMode.PREFER_ON_DEVICE : InferenceMode.ONLY_ON_DEVICE,
    inCloudParams: { model: settings.cloudModel || "gemini-3.5-flash-lite" }
  });
  const { response } = await model.generateContent(modelPrompt(lines));
  const sources = {
    [InferenceSource.ON_DEVICE]: "Firebase AI Logic · on this device",
    [InferenceSource.IN_CLOUD]: "Firebase AI Logic · in Google’s cloud"
  };
  return {
    review: decodeReview(response.text(), lines.length),
    source: sources[response.inferenceSource] ?? "Firebase AI Logic · inference location unavailable"
  };
}
