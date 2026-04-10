import {
  generating,
  inProgressContent,
  newsEmitter,
} from "../utils/newsEvents";

export default defineEventHandler((event) => {
  setResponseHeaders(event, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const send = (name: string, data: unknown) => {
    event.node.res.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // If not currently generating, tell client to re-fetch from API
  if (!generating) {
    send("idle", {});
    event.node.res.end();
    event._handled = true;
    return;
  }

  // Send any content accumulated so far (for late-joining clients)
  if (inProgressContent) {
    send("chunk", { text: inProgressContent });
  }

  const onChunk = (text: string) => {
    send("chunk", { text });
  };

  const onDone = (payload: { createdAt: string }) => {
    send("done", payload);
  };

  const onError = (message: string) => {
    send("error", { message });
  };

  newsEmitter.on("chunk", onChunk);
  newsEmitter.on("done", onDone);
  newsEmitter.on("error", onError);

  const cleanup = () => {
    newsEmitter.off("chunk", onChunk);
    newsEmitter.off("done", onDone);
    newsEmitter.off("error", onError);
    clearInterval(keepAlive);
  };

  event.node.req.on("close", cleanup);

  // Keep connection alive with periodic comments
  const keepAlive = setInterval(() => {
    event.node.res.write(": keepalive\n\n");
  }, 15_000);

  event._handled = true;
});
