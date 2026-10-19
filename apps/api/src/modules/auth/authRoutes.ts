import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { query } from "../../database/db";
import { EmailService } from "../../services/emailService";
import { env } from "../../config/env";

export async function authRoutes(fastify: FastifyInstance) {
  // 1. INICIAR REGISTRO Y EMISIÓN DE RETO OTP (6 DÍGITOS)
  fastify.post("/register", async (request: FastifyRequest, reply: FastifyReply) => {
    const registerSchema = z.object({
      email: z.string().email("Correo no válido"),
      password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
      organizationName: z.string().min(2, "El nombre de la organización debe tener al menos 2 caracteres"),
    });

    const parseResult = registerSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: parseResult.error.errors[0].message,
      });
    }

    const { email, organizationName } = parseResult.data;

    // Verificar si el correo ya existe registrado en algún tenant activo
    const existingUser = await query("SELECT id FROM users WHERE email = $1 LIMIT 1;", [email]);
    if (existingUser.rows.length > 0) {
      return reply.status(409).send({
        statusCode: 409,
        error: "Conflict",
        message: "Ya existe una cuenta registrada con este correo electrónico.",
      });
    }

    // Generar código numérico de 6 dígitos
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + env.OTP_EXPIRATION_MINUTES * 60 * 1000);

    // Guardar en la tabla email_verifications
    await query(
      `INSERT INTO email_verifications (email, otp_code, max_attempts, expires_at)
       VALUES ($1, $2, $3, $4);`,
      [email, otpCode, env.OTP_MAX_ATTEMPTS, expiresAt]
    );

    // Enviar correo electrónico mediante SMTP
    await EmailService.sendOtpEmail(email, otpCode, organizationName);

    return reply.status(200).send({
      success: true,
      message: `Código OTP de 6 dígitos enviado a ${email}. Válido por ${env.OTP_EXPIRATION_MINUTES} minutos.`,
      email,
    });
  });

  // 2. VALIDAR RETO OTP Y CREAR TENANT + USUARIO ADMIN
  fastify.post("/verify-otp", async (request: FastifyRequest, reply: FastifyReply) => {
    const verifySchema = z.object({
      email: z.string().email(),
      code: z.string().length(6, "El código OTP debe ser de 6 dígitos"),
      organizationName: z.string().min(2),
      password: z.string().min(8),
    });

    const parseResult = verifySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: parseResult.error.errors[0].message,
      });
    }

    const { email, code, organizationName, password } = parseResult.data;

    // Buscar el reto OTP más reciente y no verificado
    const otpRecord = await query(
      `SELECT * FROM email_verifications
       WHERE email = $1 AND is_verified = FALSE
       ORDER BY created_at DESC LIMIT 1;`,
      [email]
    );

    if (otpRecord.rows.length === 0) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: "No hay ninguna solicitud de verificación activa para este correo.",
      });
    }

    const otp = otpRecord.rows[0];

    // Verificar si expiró
    if (new Date() > new Date(otp.expires_at)) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: "El código ha expirado. Por favor solicita uno nuevo.",
      });
    }

    // Verificar número de intentos fallidos
    if (otp.attempts_count >= otp.max_attempts) {
      return reply.status(403).send({
        statusCode: 403,
        error: "Forbidden",
        message: "Has superado el límite de 3 intentos fallidos. Solicita un nuevo código.",
      });
    }

    // Comprobar coincidencia del código
    if (otp.otp_code !== code) {
      await query(
        `UPDATE email_verifications SET attempts_count = attempts_count + 1 WHERE id = $1;`,
        [otp.id]
      );
      const remaining = otp.max_attempts - (otp.attempts_count + 1);
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: `Código incorrecto. Te quedan ${remaining} intento(s).`,
      });
    }

    // Código válido: Crear Tenant, Usuario y Permisos en transacción
    const slug = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50) + `-${Date.now().toString().slice(-4)}`;

    const passwordHash = await bcrypt.hash(password, 10);

    // 1. Crear Organización (Tenant)
    const tenantRes = await query(
      `INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id, name, slug;`,
      [organizationName, slug]
    );
    const tenant = tenantRes.rows[0];

    // 2. Crear Usuario Administrador
    const userRes = await query(
      `INSERT INTO users (tenant_id, email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4, 'admin')
       RETURNING id, tenant_id, email, full_name, role;`,
      [tenant.id, email, passwordHash, organizationName]
    );
    const user = userRes.rows[0];

    // 3. Crear Permisos Granulares RBAC completos para el Admin
    await query(
      `INSERT INTO user_permissions (tenant_id, user_id, can_add_products, can_edit_products, can_delete_products, can_manage_users)
       VALUES ($1, $2, TRUE, TRUE, TRUE, TRUE);`,
      [tenant.id, user.id]
    );

    // 4. Marcar OTP como verificado
    await query(`UPDATE email_verifications SET is_verified = TRUE WHERE id = $1;`, [otp.id]);

    // Generar Token JWT con tenant_id y roles
    const token = fastify.jwt.sign({
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role,
      email: user.email,
    });

    return reply.status(201).send({
      success: true,
      message: "Organización y cuenta creadas exitosamente.",
      token,
      user,
      tenant,
    });
  });

  // 3. INICIO DE SESIÓN CLÁSICO (EMAIL + CONTRASEÑA)
  fastify.post("/login", async (request: FastifyRequest, reply: FastifyReply) => {
    const loginSchema = z.object({
      email: z.string().email(),
      password: z.string().min(1),
    });

    const parseResult = loginSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: parseResult.error.errors[0].message,
      });
    }

    const { email, password } = parseResult.data;

    const userRes = await query(
      `SELECT u.id, u.tenant_id, u.email, u.password_hash, u.full_name, u.role, u.is_active,
              t.name as tenant_name, t.slug as tenant_slug,
              p.can_add_products, p.can_edit_products, p.can_delete_products, p.can_manage_users
       FROM users u
       JOIN tenants t ON t.id = u.tenant_id
       LEFT JOIN user_permissions p ON p.user_id = u.id AND p.tenant_id = u.tenant_id
       WHERE u.email = $1 LIMIT 1;`,
      [email]
    );

    if (userRes.rows.length === 0) {
      return reply.status(401).send({
        statusCode: 401,
        error: "Unauthorized",
        message: "Credenciales incorrectas o usuario no encontrado.",
      });
    }

    const user = userRes.rows[0];

    if (!user.is_active) {
      return reply.status(403).send({
        statusCode: 403,
        error: "Forbidden",
        message: "Esta cuenta se encuentra inactiva. Contacta al administrador.",
      });
    }

    if (!user.password_hash) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: "Esta cuenta fue creada mediante Google Sign-In. Utiliza el botón de Google.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return reply.status(401).send({
        statusCode: 401,
        error: "Unauthorized",
        message: "Credenciales incorrectas.",
      });
    }

    // Firmar JWT
    const token = fastify.jwt.sign({
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role,
      email: user.email,
    });

    return reply.status(200).send({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        permissions: {
          can_add_products: user.can_add_products ?? false,
          can_edit_products: user.can_edit_products ?? false,
          can_delete_products: user.can_delete_products ?? false,
          can_manage_users: user.can_manage_users ?? false,
        },
      },
      tenant: {
        id: user.tenant_id,
        name: user.tenant_name,
        slug: user.tenant_slug,
      },
    });
  });

  // 4. AUTENTICACIÓN NATIVA CON GOOGLE OAUTH 2.0
  fastify.post("/google", async (request: FastifyRequest, reply: FastifyReply) => {
    const googleSchema = z.object({
      idToken: z.string().min(1, "El idToken de Google es requerido"),
    });

    const parseResult = googleSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: "Bad Request",
        message: parseResult.error.errors[0].message,
      });
    }

    const { idToken } = parseResult.data;

    if (!env.GOOGLE_CLIENT_ID) {
      return reply.status(500).send({
        statusCode: 500,
        error: "Internal Server Error",
        message: "GOOGLE_CLIENT_ID no está configurado en las variables de entorno del backend.",
      });
    }

    try {
      const { OAuth2Client } = await import("google-auth-library");
      const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: [
          env.GOOGLE_CLIENT_ID,
          ...(env.GOOGLE_ANDROID_CLIENT_ID ? [env.GOOGLE_ANDROID_CLIENT_ID] : []),
          ...(env.GOOGLE_IOS_CLIENT_ID ? [env.GOOGLE_IOS_CLIENT_ID] : []),
        ],
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        return reply.status(400).send({
          statusCode: 400,
          error: "Bad Request",
          message: "Token de Google no contiene información de correo válida.",
        });
      }

      const email = payload.email;
      const fullName = payload.name || "Usuario Google";
      const googleId = payload.sub;
      const avatarUrl = payload.picture || null;

      // Buscar si el usuario ya existe
      let userRes = await query(
        `SELECT u.id, u.tenant_id, u.email, u.full_name, u.role, u.is_active,
                t.name as tenant_name, t.slug as tenant_slug,
                p.can_add_products, p.can_edit_products, p.can_delete_products, p.can_manage_users
         FROM users u
         JOIN tenants t ON t.id = u.tenant_id
         LEFT JOIN user_permissions p ON p.user_id = u.id AND p.tenant_id = u.tenant_id
         WHERE u.email = $1 LIMIT 1;`,
        [email]
      );

      let user: any;
      let tenant: any;

      if (userRes.rows.length === 0) {
        // PRIMER REGISTRO: Crear automáticamente Tenant + Usuario + Permisos Admin
        const orgName = `Organización de ${fullName.split(" ")[0]}`;
        const slug = orgName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-")
          .replace(/-+/g, "-")
          .slice(0, 45) + `-${Date.now().toString().slice(-4)}`;

        const tenantInsert = await query(
          `INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id, name, slug;`,
          [orgName, slug]
        );
        tenant = tenantInsert.rows[0];

        const userInsert = await query(
          `INSERT INTO users (tenant_id, email, full_name, avatar_url, role, auth_provider, google_id)
           VALUES ($1, $2, $3, $4, 'admin', 'google', $5)
           RETURNING id, tenant_id, email, full_name, role;`,
          [tenant.id, email, fullName, avatarUrl, googleId]
        );
        user = userInsert.rows[0];

        await query(
          `INSERT INTO user_permissions (tenant_id, user_id, can_add_products, can_edit_products, can_delete_products, can_manage_users)
           VALUES ($1, $2, TRUE, TRUE, TRUE, TRUE);`,
          [tenant.id, user.id]
        );

        user.permissions = {
          can_add_products: true,
          can_edit_products: true,
          can_delete_products: true,
          can_manage_users: true,
        };
      } else {
        // USUARIO EXISTENTE: Iniciar sesión directamente
        user = userRes.rows[0];
        tenant = {
          id: user.tenant_id,
          name: user.tenant_name,
          slug: user.tenant_slug,
        };
        user.permissions = {
          can_add_products: user.can_add_products ?? false,
          can_edit_products: user.can_edit_products ?? false,
          can_delete_products: user.can_delete_products ?? false,
          can_manage_users: user.can_manage_users ?? false,
        };
      }

      // Generar token JWT firmado
      const token = fastify.jwt.sign({
        userId: user.id,
        tenantId: user.tenant_id,
        role: user.role,
        email: user.email,
      });

      return reply.status(200).send({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          permissions: user.permissions,
        },
        tenant,
      });
    } catch (error: any) {
      return reply.status(401).send({
        statusCode: 401,
        error: "Unauthorized",
        message: "No se pudo verificar el token de Google: " + error.message,
      });
    }
  });
}
