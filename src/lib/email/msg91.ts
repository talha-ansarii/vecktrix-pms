import type { SendEmailInput } from "./types";

/** Msg91 Email API v5 — https://docs.msg91.com/email */
export async function sendViaMsg91(input: SendEmailInput): Promise<void> {
  const authKey = process.env.MSG91_AUTH_KEY;
  const fromEmail = process.env.MSG91_FROM_EMAIL;
  const fromName = process.env.MSG91_FROM_NAME ?? "Vecktrix";

  if (!authKey || !fromEmail) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("MSG91_AUTH_KEY and MSG91_FROM_EMAIL must be set in production");
    }
    console.log("[email stub]", input.to, input.subject);
    return;
  }

  const res = await fetch("https://control.msg91.com/api/v5/email/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      authkey: authKey,
    },
    body: JSON.stringify({
      to: [{ email: input.to }],
      from: { email: fromEmail, name: fromName },
      subject: input.subject,
      body: { type: "html", data: input.html },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Msg91 email failed: ${res.status} ${body}`);
  }
}
