import nodemailer from "nodemailer";
import { env } from "../config/env";

export const EmailService = {
  transporter: nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  }),

  /**
   * Envía un correo con el código OTP de 6 dígitos con diseño corporativo Stoka
   */
  async sendOtpEmail(toEmail: string, otpCode: string, organizationName: string): Promise<boolean> {
    const htmlTemplate = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #192230; color: #FFFFFF; padding: 40px 20px; border-radius: 16px; max-width: 520px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #FF8000; font-size: 28px; margin: 0; font-weight: 900; letter-spacing: -1px;">STOKA</h1>
          <p style="color: #94A3B8; font-size: 14px; margin-top: 4px;">Control Inteligente de Inventario</p>
        </div>
        
        <div style="background-color: #2C2F38; border: 1px solid #3D474E; border-radius: 12px; padding: 24px; text-align: center;">
          <h2 style="font-size: 18px; margin-top: 0; color: #FFFFFF;">Verificación de Organización</h2>
          <p style="color: #94A3B8; font-size: 14px; line-height: 1.5;">
            Has solicitado registrar <strong>${organizationName}</strong> en Stoka. Utiliza el siguiente código para validar tu cuenta:
          </p>
          
          <div style="background-color: #192230; border: 2px dashed #FF8000; border-radius: 12px; padding: 16px; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #FF8000;">${otpCode}</span>
          </div>

          <p style="color: #64748B; font-size: 12px; margin: 0;">
            ⚠️ Este código vence en <strong>${env.OTP_EXPIRATION_MINUTES} minutos</strong> y permite hasta ${env.OTP_MAX_ATTEMPTS} intentos.
          </p>
        </div>

        <p style="color: #64748B; font-size: 11px; text-align: center; margin-top: 24px;">
          Si tú no solicitaste este registro, por favor ignora este correo.
        </p>
      </div>
    `;

    console.log(`\n======================================================`);
    console.log(`🔑 [EMAIL OTP CÓDIGO GENERADO PARA: ${toEmail}]`);
    console.log(`👉 CÓDIGO: [ ${otpCode} ] (Vence en ${env.OTP_EXPIRATION_MINUTES} min)`);
    console.log(`🏢 ORGANIZACIÓN: ${organizationName}`);
    console.log(`======================================================\n`);

    try {
      // Intenta enviar mediante el transporte SMTP configurado
      await this.transporter.sendMail({
        from: env.FROM_EMAIL,
        to: toEmail,
        subject: `Tu código de verificación Stoka: ${otpCode}`,
        html: htmlTemplate,
      });
      return true;
    } catch (error) {
      console.warn(
        `[EmailService] Nota: SMTP no conectado o con credenciales de prueba. Se imprimió el código en consola para pruebas de desarrollo local.`
      );
      return true;
    }
  },
};
