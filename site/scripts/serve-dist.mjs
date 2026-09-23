import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { previewHost as host, previewPort as port } from "./preview-target.mjs";

const root = resolve(process.cwd(), "dist");
// Browsers enforce some of these strictly: module scripts need a JavaScript
// type, and WebAssembly.instantiateStreaming rejects .wasm without
// application/wasm. Anything unlisted is served as application/octet-stream.
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".md", "text/markdown; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".wasm", "application/wasm"],
  [".webmanifest", "application/manifest+json"],
  [".webp", "image/webp"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
  [".xml", "application/xml; charset=utf-8"],
]);

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url ?? "/", `http://${host}:${port}`).pathname);
    const candidate = resolve(root, pathname.replace(/^\/+/, ""));
    if (candidate !== root && !candidate.startsWith(`${root}${sep}`)) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    let file = candidate;
    const info = await stat(file);
    if (info.isDirectory()) file = resolve(file, "index.html");
    const fileInfo = await stat(file);
    if (!fileInfo.isFile()) throw new Error("Not a file");

    response.writeHead(200, {
      "Content-Length": fileInfo.size,
      "Content-Type": contentTypes.get(extname(file)) ?? "application/octet-stream",
    });
    if (request.method === "HEAD") response.end();
    else createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
  }
});

server.listen(port, host, () => {
  process.stdout.write(`Serving dist at http://${host}:${port}\n`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
