import bcrypt from "bcryptjs";
import { pool } from "./db";

async function seed() {
  console.log("🌱 Iniciando seed de la base de datos en Supabase...");

  try {
    const orgName = "Distribuidora Stoka";
    const slug = "distribuidora-stoka";
    const email = "admin@stoka.app";
    const password = "Password123!";

    // 1. Verificar si el tenant ya existe
    let tenantRes = await pool.query("SELECT id FROM tenants WHERE slug = $1 LIMIT 1;", [slug]);
    let tenantId: string;

    if (tenantRes.rows.length === 0) {
      const newTenant = await pool.query(
        "INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id;",
        [orgName, slug]
      );
      tenantId = newTenant.rows[0].id;
      console.log(`✅ Organización creada: ${orgName} (${tenantId})`);
    } else {
      tenantId = tenantRes.rows[0].id;
      console.log(`ℹ️ Organización existente: ${orgName} (${tenantId})`);
    }

    // 2. Verificar si el usuario ya existe
    let userRes = await pool.query("SELECT id FROM users WHERE email = $1 LIMIT 1;", [email]);
    let userId: string;

    if (userRes.rows.length === 0) {
      const passwordHash = await bcrypt.hash(password, 10);
      const newUser = await pool.query(
        `INSERT INTO users (tenant_id, email, password_hash, full_name, role)
         VALUES ($1, $2, $3, $4, 'admin')
         RETURNING id;`,
        [tenantId, email, passwordHash, "Administrador Stoka"]
      );
      userId = newUser.rows[0].id;
      console.log(`✅ Usuario creado: ${email} (${userId})`);
    } else {
      userId = userRes.rows[0].id;
      console.log(`ℹ️ Usuario existente: ${email} (${userId})`);
    }

    // 3. Permisos de administrador
    await pool.query(
      `INSERT INTO user_permissions (tenant_id, user_id, can_add_products, can_edit_products, can_delete_products, can_manage_users)
       VALUES ($1, $2, TRUE, TRUE, TRUE, TRUE)
       ON CONFLICT (tenant_id, user_id) 
       DO UPDATE SET can_add_products = TRUE, can_edit_products = TRUE, can_delete_products = TRUE, can_manage_users = TRUE;`,
      [tenantId, userId]
    );
    console.log("✅ Permisos RBAC asignados.");

    console.log("\n=======================================================");
    console.log("🎉 SEED COMPLETADO CON ÉXITO");
    console.log(`📧 Email:    ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log("=======================================================\n");
  } catch (error) {
    console.error("❌ Error ejecutando seed:", error);
  } finally {
    await pool.end();
  }
}

seed();
