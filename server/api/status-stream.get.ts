import { generating, newsEmitter } from "../utils/newsEvents";

export default defineEventHandler((event) => {
  setResponseHeaders(event, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const send = (name: string, data: unknown) => {
    event.node.res.write(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  // If generation is already in progress, notify the joining client
  if (generating) {
    send("generation-start", {});
  }

  const onStart = () => send("generation-start", {});
  const onDone = (payload: { createdAt: string }) =>
    send("generation-done", payload);
  const onError = () => send("generation-done", {});

  newsEmitter.on("generation-start", onStart);
  newsEmitter.on("done", onDone);
  newsEmitter.on("error", onError);

  const cleanup = () => {
    newsEmitter.off("generation-start", onStart);
    newsEmitter.off("done", onDone);
    newsEmitter.off("error", onError);
    clearInterval(keepAlive);
  };

  event.node.req.on("close", cleanup);

  const keepAlive = setInterval(() => {
    event.node.res.write(": keepalive\n\n");
  }, 15_000);

  event._handled = true;
});
