import { Resend } from 'resend'

let resendInstance: Resend | null = null

function getResend(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('RESEND_API_KEY no está configurada en las variables de entorno')
    }
    resendInstance = new Resend(apiKey)
  }
  return resendInstance
}

export async function enviarCodigoPorEmail(
  email: string, nombre: string, codigo: string
) {
  if (!process.env.EMAIL_FROM) {
    throw new Error('EMAIL_FROM no está configurada en las variables de entorno')
  }

  const resend = getResend()

  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to:      email,
    subject: 'Tu código de acceso — SADERH',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto">
        <div style="background:#621132;padding:20px 24px">
          <h2 style="color:#fff;margin:0">Sistema SADERH</h2>
          <p style="color:rgba(255,255,255,.8);margin:4px 0 0;font-size:13px">
            Secretaría de Agricultura · Hidalgo
          </p>
        </div>
        <div style="padding:24px;border:1px solid #e5e7eb">
          <p>Hola <strong>${nombre}</strong>,</p>
          <p>Tu código de acceso al sistema es:</p>
          <div style="background:#f9fafb;border:2px dashed #621132;border-radius:8px;
                      padding:20px;text-align:center;margin:20px 0">
            <span style="font-size:36px;font-weight:900;letter-spacing:8px;color:#621132">
              ${codigo}
            </span>
          </div>
          <p style="color:#6b7280;font-size:13px">
            Guarda este código. Lo necesitas para entrar a la app móvil.
            Si no solicitaste esto, contacta a tu coordinador.
          </p>
        </div>
      </div>
    `,
  })
}
