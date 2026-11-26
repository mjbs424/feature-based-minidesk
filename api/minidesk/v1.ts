import type { IncomingMessage, ServerResponse } from "node:http";
import { handle } from "../../server/minidesk/app.js";

export default async function handler(
  incoming: IncomingMessage,
  outgoing: ServerResponse,
): Promise<void> {
  const parts: Buffer[] = [];
  let size = 0;
  try {
    for await (const chunk of incoming) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
      size += bytes.length;
      if (size > 32768) {
        outgoing.writeHead(413, {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        });
        outgoing.end(
          JSON.stringify({ error: { code: "VALIDATION_ERROR", message: "Request is too large" } }),
        );
        return;
      }
      parts.push(bytes);
    }
    const origin = `https://${incoming.headers.host ?? "localhost"}`;
    const request = new Request(new URL(incoming.url ?? "/", origin), {
      method: incoming.method ?? "GET",
      headers: incoming.headers as HeadersInit,
      body: parts.length ? Buffer.concat(parts) : undefined,
    });
    const result = await handle(request);
    outgoing.writeHead(result.status, Object.fromEntries(result.headers));
    outgoing.end(result.status === 204 ? undefined : Buffer.from(await result.arrayBuffer()));
  } catch {
    outgoing.writeHead(500, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    outgoing.end(JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Server error" } }));
  }
}
