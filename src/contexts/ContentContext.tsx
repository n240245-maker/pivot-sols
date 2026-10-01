import {createContext, useCallback, useContext, useEffect, useRef, useState} from 'react'
import type {ReactNode} from 'react'
import {useLocation} from 'react-router'
import {fetchPublishedContent} from '../lib/contentApi'
import {emptyContent} from '../types/content'
import type {PublicContent} from '../types/content'

export interface ContentState {data:PublicContent; status:'loading'|'ready'|'error'; reload:()=>void}
export const ContentContext = createContext<ContentState>({data:emptyContent,status:'loading',reload:()=>undefined})
export function ContentProvider({children}:{children:ReactNode}) {
  const {pathname}=useLocation()
  const [data,setData]=useState<PublicContent>(emptyContent)
  const [status,setStatus]=useState<ContentState['status']>('loading')
  const request=useRef<AbortController|null>(null)
  const loadedAt=useRef(0)
  const reload=useCallback(()=>{
    request.current?.abort()
    const controller=new AbortController()
    request.current=controller
    setStatus('loading')
    const timeout=setTimeout(()=>controller.abort(),15_000)
    void fetchPublishedContent(controller.signal).then(value=>{
      if(request.current!==controller)return
      setData(value);loadedAt.current=Date.now();setStatus('ready')
    }).catch(()=>{
      if(request.current!==controller)return
      setData(emptyContent);setStatus('error')
    }).finally(()=>clearTimeout(timeout))
  },[])
  useEffect(()=>{
    if(!pathname.startsWith('/admin') && !['/','/login','/signup'].includes(pathname) && Date.now()-loadedAt.current>10_000)reload()
  },[pathname,reload])
  useEffect(()=>{
    const invalidate=()=>{loadedAt.current=0;reload()}
    const focus=()=>{if(loadedAt.current && Date.now()-loadedAt.current>10_000)reload()}
    window.addEventListener('pivot-content-changed',invalidate)
    window.addEventListener('focus',focus)
    return()=>{request.current?.abort();request.current=null;window.removeEventListener('pivot-content-changed',invalidate);window.removeEventListener('focus',focus)}
  },[reload])
  return <ContentContext.Provider value={{data,status,reload}}>{children}</ContentContext.Provider>
}
export const useContent=()=>useContext(ContentContext)
