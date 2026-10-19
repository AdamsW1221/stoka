import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { withTenantContext } from "../../database/db";
import { authenticateToken } from "../../middlewares/authMiddleware";

export async function inventoryRoutes(fastify: FastifyInstance) {
  // Proteger todas las rutas de inventario con JWT
  fastify.addHook("preHandler", authenticateToken);

  // 1. DASHBOARD: MÉTRICAS AGREGADAS CON RLS Y FILTRO DE PERÍODO
  fastify.get("/dashboard/metrics", async (request: FastifyRequest, reply: FastifyReply) => {
    const querySchema = z.object({
      period: z.enum(["today", "week", "month", "year"]).default("month"),
    });

    const { period } = querySchema.parse(request.query || {});
    const tenantId = request.user.tenantId;

    return withTenantContext(tenantId, async (client) => {
      // 1.1 Totales del catálogo actual (Aislamiento Multi-Tenant estricto)
      const catalogMetricsRes = await client.query(
        `SELECT 
          COUNT(*)::int AS total_products_count,
          COALESCE(SUM(stock * price), 0)::float AS total_inventory_value,
          COUNT(CASE WHEN stock < min_stock_threshold THEN 1 END)::int AS low_stock_count
        FROM products
        WHERE tenant_id = $1;`,
        [tenantId]
      );

      // 1.2 Filtro de fecha para salidas (OUT)
      let dateFilterSql = "NOW() - INTERVAL '30 days'";
      if (period === "today") dateFilterSql = "DATE_TRUNC('day', NOW())";
      else if (period === "week") dateFilterSql = "NOW() - INTERVAL '7 days'";
      else if (period === "month") dateFilterSql = "NOW() - INTERVAL '30 days'";
      else if (period === "year") dateFilterSql = "NOW() - INTERVAL '365 days'";

      const consumedRes = await client.query(
        `SELECT COALESCE(SUM(total_amount), 0)::float AS consumed_value
        FROM inventory_movements
        WHERE tenant_id = $1 AND type = 'OUT' AND created_at >= ${dateFilterSql};`,
        [tenantId]
      );

      const catalog = catalogMetricsRes.rows[0];
      const consumed = consumedRes.rows[0];

      return reply.send({
        period,
        totalProductsCount: catalog.total_products_count,
        totalInventoryValue: catalog.total_inventory_value,
        consumedValueInPeriod: consumed.consumed_value,
        lowStockCount: catalog.low_stock_count,
      });
    });
  });

  // 2. LISTAR MERCANCÍAS (CATÁLOGO MULTI-TENANT)
  fastify.get("/products", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.user.tenantId;

    return withTenantContext(tenantId, async (client) => {
      const res = await client.query(
        `SELECT id, tenant_id, name, description, image_url, stock, price, min_stock_threshold, created_at, updated_at
        FROM products
        WHERE tenant_id = $1
        ORDER BY created_at DESC;`,
        [tenantId]
      );

      return reply.send({ products: res.rows });
    });
  });

  // 3. CREAR NUEVA MERCANCÍA
  fastify.post("/products", async (request: FastifyRequest, reply: FastifyReply) => {
    const createSchema = z.object({
      name: z.string().min(1, "El nombre es requerido"),
      description: z.string().optional().default(""),
      image_url: z.string().optional().nullable(),
      stock: z.number().int().min(0, "El stock no puede ser negativo"),
      price: z.number().min(0, "El precio no puede ser negativo"),
      min_stock_threshold: z.number().int().default(5),
    });

    const body = createSchema.parse(request.body);
    const { tenantId, userId } = request.user;

    return withTenantContext(tenantId, async (client) => {
      // Validar permiso RBAC can_add_products
      const permRes = await client.query(
        "SELECT can_add_products FROM user_permissions WHERE user_id = $1 AND tenant_id = $2;",
        [userId, tenantId]
      );
      if (permRes.rows.length === 0 || !permRes.rows[0].can_add_products) {
        return reply.status(403).send({
          statusCode: 403,
          error: "Forbidden",
          message: "No tienes permiso para agregar productos (can_add_products requerido).",
        });
      }

      // Insertar producto
      const insertRes = await client.query(
        `INSERT INTO products (tenant_id, name, description, image_url, stock, price, min_stock_threshold, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *;`,
        [
          tenantId,
          body.name,
          body.description,
          body.image_url,
          body.stock,
          body.price,
          body.min_stock_threshold,
          userId,
        ]
      );
      const product = insertRes.rows[0];

      // Registrar movimiento inicial si stock > 0
      if (body.stock > 0) {
        await client.query(
          `INSERT INTO inventory_movements (tenant_id, product_id, type, quantity, unit_price, reason, created_by)
           VALUES ($1, $2, 'IN', $3, $4, 'Stock inicial de creación', $5);`,
          [tenantId, product.id, body.stock, body.price, userId]
        );
      }

      return reply.status(201).send({ product });
    });
  });

  // 4. AJUSTE RÁPIDO DE STOCK (+ / -)
  fastify.patch("/products/:id/stock", async (request: FastifyRequest, reply: FastifyReply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const bodySchema = z.object({
      delta: z.number().int(), // ej: +1 o -1
      reason: z.string().optional().default("Ajuste manual rápido"),
    });

    const { id } = paramsSchema.parse(request.params);
    const { delta, reason } = bodySchema.parse(request.body);
    const { tenantId, userId } = request.user;

    return withTenantContext(tenantId, async (client) => {
      // Validar permiso RBAC can_edit_products
      const permRes = await client.query(
        "SELECT can_edit_products FROM user_permissions WHERE user_id = $1 AND tenant_id = $2;",
        [userId, tenantId]
      );
      if (permRes.rows.length === 0 || !permRes.rows[0].can_edit_products) {
        return reply.status(403).send({
          statusCode: 403,
          error: "Forbidden",
          message: "No tienes permiso para editar productos.",
        });
      }

      // Obtener producto garantizando pertenencia al tenant
      const prodRes = await client.query(
        "SELECT * FROM products WHERE id = $1 AND tenant_id = $2;",
        [id, tenantId]
      );
      if (prodRes.rows.length === 0) {
        return reply.status(404).send({ statusCode: 404, message: "Producto no encontrado en esta organización." });
      }

      const product = prodRes.rows[0];
      const newStock = Math.max(0, product.stock + delta);
      const actualDelta = newStock - product.stock;

      if (actualDelta === 0) {
        return reply.send({ product });
      }

      // Actualizar stock
      const updatedRes = await client.query(
        "UPDATE products SET stock = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3 RETURNING *;",
        [newStock, id, tenantId]
      );
      const updatedProduct = updatedRes.rows[0];

      // Registrar movimiento de inventario
      const movementType = actualDelta > 0 ? "IN" : "OUT";
      const quantity = Math.abs(actualDelta);

      await client.query(
        `INSERT INTO inventory_movements (tenant_id, product_id, type, quantity, unit_price, reason, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7);`,
        [tenantId, id, movementType, quantity, product.price, reason, userId]
      );

      return reply.send({
        product: updatedProduct,
        movement: { type: movementType, quantity },
      });
    });
  });

  // 5. ELIMINAR MERCANCÍA
  fastify.delete("/products/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    const { id } = paramsSchema.parse(request.params);
    const { tenantId, userId } = request.user;

    return withTenantContext(tenantId, async (client) => {
      const permRes = await client.query(
        "SELECT can_delete_products FROM user_permissions WHERE user_id = $1 AND tenant_id = $2;",
        [userId, tenantId]
      );
      if (permRes.rows.length === 0 || !permRes.rows[0].can_delete_products) {
        return reply.status(403).send({
          statusCode: 403,
          error: "Forbidden",
          message: "No tienes permiso para eliminar productos (can_delete_products requerido).",
        });
      }

      const delRes = await client.query(
        "DELETE FROM products WHERE id = $1 AND tenant_id = $2 RETURNING id;",
        [id, tenantId]
      );
      if (delRes.rows.length === 0) {
        return reply.status(404).send({ statusCode: 404, message: "Producto no encontrado en tu organización." });
      }
      return reply.send({ success: true, message: "Producto eliminado correctamente." });
    });
  });
}
