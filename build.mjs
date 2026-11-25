import { build } from "esbuild";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";

const root = new URL("./", import.meta.url);
const output = new URL("dist/", root);
await mkdir(output, { recursive: true });
await build({
  entryPoints: [fileURLToPath(new URL("app.mjs", root))],
  outfile: fileURLToPath(new URL("bundle.js", output)),
  bundle: true, minify: true, format: "esm", target: "chrome139",
  define: { BUILD_MODE: JSON.stringify(process.argv.includes("--public") ? "chrome" : process.argv.includes("--hosting") ? "hosting" : "developer") }
});
await copyFile(new URL("style.css", root), new URL("style.css", output));
let html = await readFile(new URL("index.html", root), "utf8");
if (process.argv.includes("--public") || process.argv.includes("--hosting")) {
  // A public brief stays in the tab, even if a future script attempts a network fallback.
  html = html.replace("<head>", '<head><meta http-equiv="Content-Security-Policy" content="connect-src \'self\'; form-action \'none\'; object-src \'none\'">');
}
await writeFile(new URL("index.html", output), html);
// The public web configuration is provided by the host, outside source control.
const config = new URL("firebase-config.json", root);
if (process.argv.includes("--serve")) {
  const files = new Map([
    ["/", ["text/html", new URL("index.html", output)]],
    ["/index.html", ["text/html", new URL("index.html", output)]],
    ["/bundle.js", ["text/javascript", new URL("bundle.js", output)]],
    ["/style.css", ["text/css", new URL("style.css", output)]]
  ]);
  if (process.argv.includes("--hosting")) files.set("/web-app.json", ["application/json", new URL("web-app.json", root)]);
  else if (!process.argv.includes("--public")) files.set("/firebase-config.json", ["application/json", config]);
  const requestedPort = Number(process.env.PORT ?? 4176);
  const server = createServer(async (req, res) => {
    const file = files.get(req.url.split("?")[0]);
    if (!file || req.method !== "GET") {
      res.writeHead(404).end();
      return;
    }
    try {
      const data = await readFile(file[1]);
      res.writeHead(200, { "Content-Type": file[0] + "; charset=utf-8", "Cache-Control": "no-store" }).end(data);
    } catch {
      res.writeHead(404).end();
    }
  }).listen(requestedPort, "127.0.0.1", () => console.log("Brief Loupe at http://127.0.0.1:" + server.address().port));
}
