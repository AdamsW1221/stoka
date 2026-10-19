import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { env } from "./config/env";
import { authRoutes } from "./modules/auth/authRoutes";
import { inventoryRoutes } from "./modules/inventory/inventoryRoutes";
import { pool } from "./database/db";

const fastify = Fastify({
  logger: true,
});

async function main() {
  try {
    // 1. Configuración de CORS
    await fastify.register(cors, {
      origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN,
      credentials: true,
    });

    // 2. Configuración de JWT
    await fastify.register(jwt, {
      secret: env.JWT_SECRET,
      sign: {
        expiresIn: env.JWT_EXPIRES_IN,
      },
    });

    // 3. Healthcheck de API y Base de Datos
    fastify.get("/health", async () => {
      const dbStatus = await pool
        .query("SELECT 1 as healthy;")
        .then(() => "CONNECTED")
        .catch(() => "DISCONNECTED");

      return {
        service: "stoka-api",
        status: "ONLINE",
        database: dbStatus,
        timestamp: new Date().toISOString(),
      };
    });

    // 4. Registro de Rutas Modulares
    await fastify.register(authRoutes, { prefix: "/api/v1/auth" });
    await fastify.register(inventoryRoutes, { prefix: "/api/v1" });

    // 5. Iniciar Servidor
    await fastify.listen({ port: env.PORT, host: env.HOST });
    console.log(`\n🚀 [STOKA API] Servidor activo en http://${env.HOST}:${env.PORT}`);
    console.log(`📡 Endpoints disponibles en http://${env.HOST}:${env.PORT}/api/v1`);
    console.log(`🛡️  Modo Multi-Tenant y Row-Level Security (RLS) habilitados.\n`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
