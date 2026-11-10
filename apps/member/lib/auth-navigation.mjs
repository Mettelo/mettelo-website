export function safeMemberPath(value,fallback='/member'){
  if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||/[\\\u0000-\u0020]/.test(value))return fallback;
  try{
    const base='https://member.invalid';
    const url=new URL(value,base);
    if(url.origin!==base)return fallback;
    const path=url.pathname;
    if(!(path==='/admin'||path.startsWith('/admin/')||path==='/member'||path.startsWith('/member/')||path==='/onboarding'||path==='/auth/update-password'))return fallback;
    return url.pathname+url.search+url.hash;
  }catch{return fallback;}
}
