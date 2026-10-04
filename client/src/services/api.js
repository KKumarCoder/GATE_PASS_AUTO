import axios from 'axios';
export const api=axios.create({baseURL:'/api',withCredentials:true,timeout:20000});
let accessToken=null,refreshing=null;
export const setToken=value=>{accessToken=value;};
api.interceptors.request.use(config=>{if(accessToken)config.headers.Authorization=`Bearer ${accessToken}`;return config;});
api.interceptors.response.use(response=>response,error=>{
  const config=error.config;
  if(error.response?.status===401&&!config?._retry&&!config?.url?.startsWith('/auth/')){
    config._retry=true;
    if(!refreshing)refreshing=api.post('/auth/refresh').then(r=>{setToken(r.data.data.accessToken);return r;}).finally(()=>{refreshing=null;});
    return refreshing.then(()=>api(config),e=>{setToken(null);window.dispatchEvent(new Event('srps:logout'));throw e;});
  }return Promise.reject(error);
});
export const get=async url=>(await api.get(url)).data.data;
export const post=async(url,data={})=>(await api.post(url,data)).data.data;
export const message=e=>e.response?.data?.message||'Unable to reach the server. Please try again.';
export async function download(url,filename){const response=await api.get(url,{responseType:'blob'});const blob=URL.createObjectURL(response.data);const a=document.createElement('a');a.href=blob;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(blob),1000);}
