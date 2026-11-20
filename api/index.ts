import type { IncomingMessage, ServerResponse } from "http";
import { buildApp } from "../apps/api/src/server";

let appPromise: ReturnType<typeof buildApp> | null = null;

/**
 * Handler Serverless para Vercel: expone toda la API de Fastify (/api/v1/* y /health)
 * en el mismo dominio que la PWA de Stoka.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!appPromise) {
    appPromise = buildApp();
  }
  const fastify = await appPromise;
  await fastify.ready();
  fastify.server.emit("request", req, res);
}
