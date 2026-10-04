import axios from "axios";
export async function send({ mobile, message, template, variables = {}, otp }) {
  const url = process.env.WHATSAPP_API_URL;
  if (!url?.startsWith("https://") || new URL(url).search)
    throw new Error(
      "Custom WhatsApp endpoint must be HTTPS without query credentials.",
    );
  const phoneNumber = String(mobile || "").replace(/\D/g, "");
  if (!phoneNumber) throw new Error("WhatsApp recipient number is required.");
  const payload = {
    from_phone_number_id: process.env.WHATSAPP_SENDER,
    phone_number: phoneNumber,
    template_name: template || process.env.WHATSAPP_TEMPLATE,
    template_language: process.env.WHATSAPP_LANGUAGE || "en",
    message_body: message,
    copy_code: String(
      otp || variables.copy_code || variables.otp || message || "",
    ),
  };
  const { data } = await axios.post(url, payload, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
    timeout: 10000,
    maxRedirects: 0,
  });
  if (data.success === false) throw new Error("Provider rejected message.");
  return { messageId: String(data.messageId || data.id || "").slice(0, 200) };
}
