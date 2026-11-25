import { blankReview, categories, resultText, sample, sourceLines } from "./review.mjs";
import { inspectWithFirebase } from "./engine.mjs";

const byId = id => document.getElementById(id);
const brief = byId("brief");
const lineSelect = byId("line");
const categorySelect = byId("category");
const inspect = byId("inspect");
const route = byId("route");
const notice = byId("notice");
const downloadModel = byId("download-model");
brief.value = sample;
let lines = sourceLines(brief.value);
let review = blankReview();
let source = "Manual review";
let revision = 0;
let busy = false;

function element(tag, content) {
  const el = document.createElement(tag);
  el.textContent = content;
  return el;
}

function markManualChange() {
  if (!source.startsWith("Manual") && !source.endsWith(" · edited")) source += " · edited";
}

function render() {
  const sections = byId("sections");
  sections.replaceChildren();
  byId("provenance").textContent = source;
  for (const { id, label, question } of categories) {
    const section = document.createElement("section");
    section.className = "item";
    section.append(element("h3", label));
    if (!review[id].length) {
      const p = element("p", question);
      p.className = "question";
      section.append(p);
    }
    for (const n of review[id]) {
      const row = document.createElement("div");
      row.className = "quote";
      const remove = element("button", "Remove");
      remove.type = "button";
      remove.setAttribute("aria-label", "Remove line " + n + " from " + label);
      remove.addEventListener("click", () => {
        revision++;
        review[id] = review[id].filter(value => value !== n);
        markManualChange();
        render();
        byId("attach").focus();
      });
      row.append(element("span", "[" + n + "] " + lines[n - 1]), remove);
      section.append(row);
    }
    sections.append(section);
  }
  inspect.disabled = busy || !lines.length;
  byId("attach").disabled = !lines.length;
  byId("export").disabled = !Object.values(review).some(values => values.length);
}

function refreshLines() {
  lines = sourceLines(brief.value);
  lineSelect.replaceChildren(...lines.map((text, i) => new Option((i + 1) + ". " + text, String(i + 1))));
  review = blankReview();
  source = "Manual review";
  revision++;
  notice.textContent = "";
  render();
}

categorySelect.replaceChildren(...categories.map(({ label, id }) => new Option(label, id)));
brief.addEventListener("input", refreshLines);
route.addEventListener("change", () => {
  byId("privacy").textContent = route.value === "local"
    ? "Only a local model may receive your brief."
    : "Google may receive the full brief if the local model is unavailable. Use public or fictional text.";
});

async function showDownloadOption() {
  try {
    const state = await globalThis.LanguageModel?.availability();
    downloadModel.hidden = state !== "downloadable" && state !== "downloading";
    downloadModel.textContent = state === "downloading"
      ? "Check model download" : "Download on-device model (several GB)";
  } catch {
    downloadModel.hidden = true;
  }
}

downloadModel.addEventListener("click", async () => {
  downloadModel.disabled = true;
  notice.textContent = "Chrome is preparing the on-device model.";
  try {
    const session = await globalThis.LanguageModel.create({
      monitor(monitor) {
        monitor.addEventListener("downloadprogress", event => {
          notice.textContent = "Downloading on-device model: " + Math.round(event.loaded * 100) + "%";
        });
      }
    });
    session.destroy();
    notice.textContent = "The on-device model is ready.";
  } catch {
    notice.textContent = "Chrome could not finish the model download. Check the device and storage requirements.";
  } finally {
    await showDownloadOption();
    downloadModel.disabled = false;
  }
});
byId("attach").addEventListener("click", () => {
  const n = Number(lineSelect.value);
  const refs = review[categorySelect.value];
  if (refs.includes(n)) {
    notice.textContent = "That line is already attached.";
    return;
  }
  revision++;
  refs.push(n);
  refs.sort((a, b) => a - b);
  markManualChange();
  render();
  notice.textContent = "Line " + n + " attached.";
});

inspect.addEventListener("click", async () => {
  const requestedRevision = revision;
  busy = true;
  render();
  notice.textContent = "Looking for cited terms…";
  try {
    const result = await inspectWithFirebase(lines, route.value === "hybrid");
    if (revision !== requestedRevision) {
      notice.textContent = "The brief or evidence changed during analysis. Your current review was kept.";
      return;
    }
    review = result.review;
    source = result.source;
    notice.textContent = "Review the suggested source lines before relying on them.";
  } catch (error) {
    notice.textContent = revision === requestedRevision
      ? String(error.message || "Analysis was unavailable. You can attach lines manually.").slice(0,380)
      : "The brief or evidence changed during analysis. Your current review was kept.";
  } finally {
    busy = false;
    render();
  }
});

byId("export").addEventListener("click", () => {
  const blob = new Blob([resultText(review, lines, source) + "\n"], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "brief-loupe.txt";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
});
refreshLines();
if (PUBLIC_MANUAL_DEMO) {
  route.closest(".controls").hidden = true;
  inspect.hidden = true;
  byId("hint").textContent = "Public manual demo. Paste one statement per line, then attach matching lines to your evidence sheet. The sample is fictional.";
} else {
  showDownloadOption();
}
