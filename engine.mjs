import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode, InferenceSource } from "firebase/ai";
import { categories, decodeReview, modelPrompt } from "./review.mjs";

const citationSchema = {
  type: "object",
  properties: Object.fromEntries(categories.map(({ id }) => [id, { type: "array", items: { type: "integer" } }])),
  required: categories.map(({ id }) => id),
  additionalProperties: false
};
export const deviceTextOptions = {
  expectedInputs: [{ type: "text" }],
  expectedOutputs: [{ type: "text", languages: ["en"] }]
};

let settings;
let ai;
async function initialize(hosted) {
  if (ai) return;
  const response = await fetch(hosted ? "./web-app.json" : "./firebase-config.json", { cache: "no-store" });
  if (!response.ok) throw new Error("This installation needs its Firebase web configuration. You can review the brief manually.");
  settings = await response.json();
  if (!settings.firebase?.apiKey || !settings.firebase?.projectId || !settings.firebase?.appId || (!hosted && !settings.recaptchaSiteKey)) {
    throw new Error("The Firebase web configuration is missing its project, app, API key or App Check site key.");
  }
  const app = initializeApp(settings.firebase);
  if (settings.recaptchaSiteKey) initializeAppCheck(app, { provider: new ReCaptchaV3Provider(settings.recaptchaSiteKey), isTokenAutoRefreshEnabled: false });
  ai = getAI(app, { backend: new GoogleAIBackend() });
}

async function readyDevice() {
  const device = globalThis.LanguageModel;
  if (!device || typeof device.availability !== "function" || typeof device.create !== "function") {
    throw new Error("This browser has no on-device model. Use supported desktop Chrome with Gemini Nano enabled or attach the lines manually.");
  }
  if (await device.availability(deviceTextOptions) !== "available") {
    throw new Error("The on-device model is not ready. Finish the Gemini Nano download in desktop Chrome or attach the lines manually.");
  }
  return device;
}

export async function inspectInChrome(lines) {
  const device = await readyDevice();
  const session = await device.create(deviceTextOptions);
  try {
    const answer = await session.prompt(modelPrompt(lines), { responseConstraint: citationSchema });
    return { review: decodeReview(answer, lines.length), source: "Chrome Gemini Nano · on this device" };
  } finally {
    session.destroy();
  }
}

export async function inspectWithFirebase(lines, allowCloud, hosted = false) {
  if (hosted && allowCloud) throw new Error("This public installation supports on-device processing only.");
  if (!allowCloud) await readyDevice();
  await initialize(hosted);
  if (allowCloud && settings.cloudEnabled !== true) {
    throw new Error("The operator has not enabled cloud fallback on this installation. Choose on-device processing or attach the evidence manually.");
  }
  const model = getGenerativeModel(ai, {
    mode: allowCloud ? InferenceMode.PREFER_ON_DEVICE : InferenceMode.ONLY_ON_DEVICE,
    onDeviceParams: { createOptions: deviceTextOptions, promptOptions: { responseConstraint: citationSchema } },
    inCloudParams: {
      model: settings.cloudModel || "gemini-3.5-flash-lite",
      generationConfig: { responseMimeType: "application/json", responseJsonSchema: citationSchema }
    }
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
