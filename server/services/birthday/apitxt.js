import axios from 'axios';
import {birthdayPublicOrigin,publishBirthdayCard} from './media.js';
export const apitxtErrors = Object.freeze({
  101:'APITxT authentication key is missing.',
  102:'WhatsApp template name is missing.',
  103:'Recipient mobile is missing.',
  104:'APITxT project reference ID is missing.',
  202:'No valid recipient mobile number.',
  203:'WhatsApp template was not found or is not approved.',
  204:'WhatsApp project is inactive, misconfigured or has no active plan.',
  205:'WhatsApp body variables have an invalid format.',
  301:'APITxT balance is insufficient.',
  304:'APITxT authentication key is invalid or the server IP is restricted.',
  311:'APITxT detected a duplicate request. Check the provider dashboard before resending.',
  403:'APITxT project has no active plan or its subscription is suspended.',
});
const authKey=()=> (process.env.APITXT_WHATSAPP_AUTH_KEY || process.env.APITXT_AUTH_KEY || '').trim();
export function apitxtBirthdayReady() {
  return Boolean(authKey() && process.env.APITXT_WHATSAPP_PROJECT_REF_ID?.trim() && birthdayPublicOrigin());
}
export async function sendApitxtBirthday({mobile,card,config,student},{publish=publishBirthdayCard}={}) {
  if(!apitxtBirthdayReady())throw new Error('APITxT WhatsApp configuration is incomplete.');
  const headerImageUrl=await publish(card);
  try {
    const {data}=await axios.post('https://apitxt.com/api/sendWA',{
      authkey:authKey(),template_name:config.templateName,
      project_ref_id:process.env.APITXT_WHATSAPP_PROJECT_REF_ID.trim(),
      mobiles:mobile.replace(/^\+/,''),language:config.language,
      body_params:[student.name,config.wishesFrom],header_image_url:headerImageUrl,
    },{headers:{'Content-Type':'application/json'},timeout:20000,maxRedirects:0});
    // Match the provider's documented status + request_id response, not HTTP 200 alone.
    if(data?.status===200 && typeof data.request_id==='string' && data.request_id) return data.request_id;
    const code=typeof data?.status==='number'?data.status:undefined;
    const known=Object.hasOwn(apitxtErrors,code);
    const rejected=code!==311 && (known || (code>=400 && code<500));
    throw Object.assign(new Error('APITxT submission was not confirmed.'),{ambiguous:!rejected,providerCode:known?code:undefined});
  } catch(error) {
    // Never retain raw Axios errors, credentials, recipient data or card URLs.
    const responseCode=error.response?.data?.status;
    const code=error.providerCode ?? (typeof responseCode==='number' && Object.hasOwn(apitxtErrors,responseCode)?responseCode:undefined);
    const ambiguous=code===311?true:error.ambiguous ?? (code!==undefined?false:(!error.response || error.response.status>=500));
    const safeMessage=apitxtErrors[code];
    throw Object.assign(new Error(ambiguous?'APITxT submission outcome unknown.':'APITxT rejected the submission.'),{ambiguous,safeMessage});
  }
}
