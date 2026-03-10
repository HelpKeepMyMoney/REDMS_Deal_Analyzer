/**
 * Resend email helper for interest notifications.
 * Requires RESEND_API_KEY and RESEND_FROM_EMAIL env vars.
 */
import { Resend } from "resend";

let resendClient = null;

function getResend() {
  if (resendClient) return resendClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  resendClient = new Resend(apiKey);
  return resendClient;
}

/**
 * @param {{ to: string | string[]; subject: string; html: string }} options
 * @returns {Promise<{ id?: string; error?: Error }>}
 */
export async function sendEmail({ to, subject, html }) {
  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  const resend = getResend();
  const recipients = Array.isArray(to) ? to : [to];
  if (recipients.length === 0) return { error: new Error("No recipients") };

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: recipients,
      subject,
      html,
    });
    if (error) return { error };
    return { id: data?.id };
  } catch (e) {
    return { error: e };
  }
}
