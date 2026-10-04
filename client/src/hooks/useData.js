import {useEffect,useState,useCallback} from 'react';
import {get,message} from '../services/api';
export function useData(url){const [data,setData]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[version,setVersion]=useState(0);const reload=useCallback(()=>setVersion(v=>v+1),[]);
useEffect(()=>{if(!url){setData(null);setError('');setLoading(false);return;}let active=true;setLoading(true);setData(null);setError('');get(url).then(d=>active&&setData(d)).catch(e=>active&&setError(message(e))).finally(()=>active&&setLoading(false));return()=>{active=false;};},[url,version]);return{data,error,loading,reload};}
export function useDebounce(value,delay=300){const [result,setResult]=useState(value);useEffect(()=>{const timer=setTimeout(()=>setResult(value),delay);return()=>clearTimeout(timer);},[value,delay]);return result;}
