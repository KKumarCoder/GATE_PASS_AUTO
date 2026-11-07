import axios from 'axios';
export function birthdayProviderReady() {
  return process.env.WHATSAPP_PROVIDER==='meta' && Boolean(process.env.WHATSAPP_TOKEN) && /^https:\/\/graph\.facebook\.com\/v\d+\.\d+\/\d+\/messages$/.test(process.env.WHATSAPP_API_URL||'');
}
export async function sendBirthday({mobile,card,config,student}) {
  const url=process.env.WHATSAPP_API_URL;
  if(!birthdayProviderReady()) throw new Error('Meta WhatsApp configuration is incomplete.');
  const options={headers:{Authorization:`Bearer ${process.env.WHATSAPP_TOKEN}`},timeout:20000,maxRedirects:0};
  const form=new FormData();form.append('messaging_product','whatsapp');form.append('type','image/jpeg');form.append('file',new Blob([card],{type:'image/jpeg'}),'birthday.jpg');
  const uploaded=await axios.post(url.replace(/\/messages$/,'/media'),form,options);
  if(!uploaded.data.id) throw new Error('Media upload did not return an ID.');
  try {
    const {data}=await axios.post(url,{messaging_product:'whatsapp',to:mobile.replace('+',''),type:'template',template:{name:config.templateName,language:{code:config.language},components:[{type:'header',parameters:[{type:'image',image:{id:uploaded.data.id}}]},{type:'body',parameters:[student.name,config.wishesFrom].map(text=>({type:'text',text}))}]}},options);
    if(!data.messages?.[0]?.id) {const e=new Error('Submission outcome unknown.');e.ambiguous=true;throw e;}
    return data.messages[0].id;
  } catch(error) {
    // A timed-out request may already have been accepted: never automatically resend it.
    error.ambiguous=error.ambiguous || !error.response || error.response.status>=500;
    throw error;
  }
}
