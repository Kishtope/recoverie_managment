import nodemailer from "nodemailer";

export type MailMessage = { to: string; subject: string; html: string; text: string };

// Sends one email through the SMTP server in .env (SMTP_HOST / PORT / USER / PASSWORD / FROM). With no SMTP_HOST (development) the email is
// printed to the server console instead and nothing leaves the machine. Returns whether it was really sent.
export const sendMail = async (message: MailMessage): Promise<{ sent: boolean }> => {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
  if (!SMTP_HOST) {
    console.log(`[mail:dev] to=${message.to} subject="${message.subject}"\n${message.text}`);
    return { sent: false };
  }
  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASSWORD } : undefined,
  });
  await transport.sendMail({ from: SMTP_FROM || SMTP_USER, ...message });
  return { sent: true };
};
