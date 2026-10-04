import axios from 'axios';
export async function send({ mobile, message, template, variables = [] }) {
  const selected = template || process.env.WHATSAPP_TEMPLATE;
  if (!selected) throw new Error('An approved Meta message template is required.');
  const url = process.env.WHATSAPP_API_URL;
  if (!url?.startsWith('https://graph.facebook.com/')) throw new Error('Configure the versioned Meta Graph messages endpoint.');
  const { data } = await axios.post(url, { messaging_product: 'whatsapp', to: mobile.replace('+',''), type: 'template', template: {
    name: selected, language: { code: process.env.WHATSAPP_LANGUAGE || 'en' },
    components: [{ type: 'body', parameters: (variables.length ? variables : [message]).map(text => ({ type: 'text', text: String(text) })) }],
  } }, { headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` }, timeout: 10000, maxRedirects: 0 });
  return { messageId: data.messages?.[0]?.id || '' };
}
