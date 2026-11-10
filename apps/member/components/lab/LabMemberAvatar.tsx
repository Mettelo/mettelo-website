'use client';
import {useState} from 'react';

export default function LabMemberAvatar({name,photo,className}:{name:string;photo?:string|null;className?:string}){
 const [failedPhoto,setFailedPhoto]=useState<string|null>(null);
 const initials=name.trim().split(/\s+/).map(part=>part[0]||'').join('').slice(0,2).toUpperCase()||'M';
 return <span className={className} aria-hidden="true">{photo&&photo!==failedPhoto?<img src={photo} alt="" width={52} height={52} onError={()=>setFailedPhoto(photo)} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'inherit',display:'block'}}/>:initials}</span>;
}
