import { FastifyRequest, FastifyReply } from "fastify";

export interface AuthenticatedUser {
  userId: string;
  tenantId: string;
  role: string;
  email: string;
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AuthenticatedUser;
    user: AuthenticatedUser;
  }
}

export async function authenticateToken(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.status(401).send({
      statusCode: 401,
      error: "Unauthorized",
      message: "Token de sesión no válido o expirado.",
    });
  }
}

/**
 * Guardia RBAC para comprobar permisos específicos en la petición
 */
export function requireRole(allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as AuthenticatedUser;
    if (!user || !allowedRoles.includes(user.role)) {
      return reply.status(403).send({
        statusCode: 403,
        error: "Forbidden",
        message: "No tienes permisos suficientes para realizar esta acción.",
      });
    }
  };
}
