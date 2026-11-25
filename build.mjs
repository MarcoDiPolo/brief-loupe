import { build } from "esbuild";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";

const root = new URL("./", import.meta.url);
const output = new URL("dist/", root);
await mkdir(output, { recursive: true });
await build({
  entryPoints: [fileURLToPath(new URL("app.mjs", root))],
  outfile: fileURLToPath(new URL("bundle.js", output)),
  bundle: true, minify: true, format: "esm", target: "chrome139",
  define: { PUBLIC_MANUAL_DEMO: String(process.argv.includes("--public")) }
});
for (const name of ["index.html", "style.css"]) {
  await copyFile(new URL(name, root), new URL(name, output));
}
// The public web configuration is provided by the host, outside source control.
const config = new URL("firebase-config.json", root);
if (process.argv.includes("--serve")) {
  const files = new Map([
    ["/", ["text/html", new URL("index.html", output)]],
    ["/index.html", ["text/html", new URL("index.html", output)]],
    ["/bundle.js", ["text/javascript", new URL("bundle.js", output)]],
    ["/style.css", ["text/css", new URL("style.css", output)]],
    ["/firebase-config.json", ["application/json", config]]
  ]);
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
