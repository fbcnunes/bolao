import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendPasswordResetEmail(to: string, name: string, resetUrl: string) {
  await transporter.sendMail({
    from: `"Bolão 2026" <${process.env.SMTP_USER}>`,
    to,
    subject: "Recuperação de senha – Bolão 2026",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0f172a;color:#e2e8f0;border-radius:16px;">
        <h2 style="margin:0 0 8px;color:#10b981;">Bolão 2026</h2>
        <p style="margin:0 0 24px;color:#94a3b8;">Olá, <strong style="color:#e2e8f0;">${name}</strong>!</p>
        <p style="margin:0 0 24px;">Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha:</p>
        <a href="${resetUrl}" style="display:inline-block;padding:12px 28px;background:#10b981;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">Redefinir senha</a>
        <p style="margin:24px 0 0;font-size:13px;color:#64748b;">Este link expira em <strong>1 hora</strong>. Se você não solicitou a troca de senha, ignore este e-mail.</p>
        <hr style="margin:24px 0;border:none;border-top:1px solid #1e293b;">
        <p style="margin:0;font-size:12px;color:#475569;">Bolão Copa do Mundo 2026</p>
      </div>
    `,
  });
}

export async function sendPasswordChangedEmail(to: string, name: string) {
  await transporter.sendMail({
    from: `"Bolão 2026" <${process.env.SMTP_USER}>`,
    to,
    subject: "Sua senha foi alterada – Bolão 2026",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0f172a;color:#e2e8f0;border-radius:16px;">
        <h2 style="margin:0 0 8px;color:#10b981;">Bolão 2026</h2>
        <p style="margin:0 0 24px;color:#94a3b8;">Olá, <strong style="color:#e2e8f0;">${name}</strong>!</p>
        <p style="margin:0 0 8px;">Sua senha foi alterada com sucesso.</p>
        <p style="margin:0 0 24px;font-size:13px;color:#64748b;">Se você não realizou esta alteração, entre em contato com o administrador imediatamente.</p>
        <hr style="margin:24px 0;border:none;border-top:1px solid #1e293b;">
        <p style="margin:0;font-size:12px;color:#475569;">Bolão Copa do Mundo 2026</p>
      </div>
    `,
  });
}

export async function sendEmailChangedEmail(to: string, name: string, newEmail: string) {
  await transporter.sendMail({
    from: `"Bolão 2026" <${process.env.SMTP_USER}>`,
    to,
    subject: "Seu e-mail foi atualizado – Bolão 2026",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0f172a;color:#e2e8f0;border-radius:16px;">
        <h2 style="margin:0 0 8px;color:#10b981;">Bolão 2026</h2>
        <p style="margin:0 0 24px;color:#94a3b8;">Olá, <strong style="color:#e2e8f0;">${name}</strong>!</p>
        <p style="margin:0 0 8px;">O administrador atualizou o e-mail da sua conta para:</p>
        <p style="margin:0 0 24px;font-weight:700;color:#10b981;">${newEmail}</p>
        <p style="margin:0 0 24px;font-size:13px;color:#64748b;">A partir de agora, use este novo e-mail para fazer login.</p>
        <hr style="margin:24px 0;border:none;border-top:1px solid #1e293b;">
        <p style="margin:0;font-size:12px;color:#475569;">Bolão Copa do Mundo 2026</p>
      </div>
    `,
  });
}

export async function sendEmailChangeNoticeEmail(
  to: string,
  name: string,
  oldEmail: string,
  newEmail: string,
  recipient: "old" | "new"
) {
  const isOldRecipient = recipient === "old";

  await transporter.sendMail({
    from: `"Bolão 2026" <${process.env.SMTP_USER}>`,
    to,
    subject: "E-mail da conta atualizado - Bolão 2026",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#0f172a;color:#e2e8f0;border-radius:16px;">
        <h2 style="margin:0 0 8px;color:#10b981;">Bolão 2026</h2>
        <p style="margin:0 0 24px;color:#94a3b8;">Olá, <strong style="color:#e2e8f0;">${name}</strong>!</p>
        <p style="margin:0 0 12px;">
          ${isOldRecipient
            ? "O administrador atualizou o e-mail da sua conta. Este endereço não será mais usado para login."
            : "O administrador atualizou o e-mail da sua conta. A partir de agora, use este endereço para login."}
        </p>
        <div style="margin:0 0 24px;padding:14px 16px;background:#1e293b;border-radius:12px;">
          <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;">E-mail anterior</p>
          <p style="margin:0 0 14px;font-weight:700;color:#e2e8f0;">${oldEmail}</p>
          <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;">Novo e-mail</p>
          <p style="margin:0;font-weight:700;color:#10b981;">${newEmail}</p>
        </div>
        <p style="margin:0 0 24px;font-size:13px;color:#64748b;">Se você não reconhece esta alteração, entre em contato com o administrador imediatamente.</p>
        <hr style="margin:24px 0;border:none;border-top:1px solid #1e293b;">
        <p style="margin:0;font-size:12px;color:#475569;">Bolão Copa do Mundo 2026</p>
      </div>
    `,
  });
}
