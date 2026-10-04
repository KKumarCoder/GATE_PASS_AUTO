import {createContext,useContext,useEffect,useState} from 'react';
import {post,setToken} from '../services/api';
const Context=createContext();
export function AuthProvider({children}){
 const [user,setUser]=useState(null),[loading,setLoading]=useState(true);
 useEffect(()=>{let alive=true;post('/auth/refresh').then(data=>{if(alive){setToken(data.accessToken);setUser(data.user);}}).catch(()=>{}).finally(()=>alive&&setLoading(false));const clear=()=>setUser(null);window.addEventListener('srps:logout',clear);return()=>{alive=false;window.removeEventListener('srps:logout',clear);};},[]);
 const login=async values=>{const data=await post('/auth/login',values);setToken(data.accessToken);setUser(data.user);};
 const logout=async()=>{await post('/auth/logout');setToken(null);setUser(null);};
 return <Context.Provider value={{user,loading,login,logout}}>{children}</Context.Provider>;
}
export const useAuth=()=>useContext(Context);
