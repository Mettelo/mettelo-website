'use client';
import {useEffect,useRef,useState} from 'react';
import {useRouter} from 'next/navigation';
import ContentEditor from './ContentEditor';
import type {ContentDocument} from '@/lib/site-content';
export default function ContentEditorDialog({document,returnTo,canUpload}:{document:ContentDocument;returnTo:string;canUpload:boolean}){const dialog=useRef<HTMLDialogElement>(null),state=useRef({dirty:false,busy:false}),router=useRouter();useEffect(()=>{dialog.current?.showModal()},[]);function close(){if(state.current.busy)return;if(state.current.dirty&&!window.confirm('Discard your unsaved brief changes?'))return;router.replace(returnTo,{scroll:false});}return <dialog ref={dialog} className="contentEditorDialog" aria-label="Edit project brief" onCancel={e=>{e.preventDefault();close()}}><header><strong>Edit project brief</strong><button type="button" className="contentClose" aria-label="Close brief editor" onClick={close}>×</button></header><div><ContentEditor document={document} embedded canUpload={canUpload} onState={next=>{state.current=next}}/></div></dialog>}
