import {birthdayProviderReady as metaReady,sendBirthday as sendMeta} from './meta.js';
import {apitxtBirthdayReady,sendApitxtBirthday} from './apitxt.js';
export const birthdayProvider=()=>process.env.BIRTHDAY_WHATSAPP_PROVIDER || process.env.WHATSAPP_PROVIDER || 'none';
export function birthdayProviderReady(){return birthdayProvider()==='apitxt'?apitxtBirthdayReady():birthdayProvider()==='meta'?metaReady():false;}
export function sendBirthday(args){
 if(birthdayProvider()==='apitxt')return sendApitxtBirthday(args);
 if(birthdayProvider()==='meta')return sendMeta(args);
 throw new Error('Birthday WhatsApp provider is not configured.');
}
