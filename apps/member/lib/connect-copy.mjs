/* Exact system-copy aliases only: never rewrite member posts, names or project text. */
const legacy=new Map([
 ['Market update saved.','Connect update saved.'],
 ['A new reply to your Market post','A new reply to your Connect post'],
 ['A new reply to your Market comment','A new reply to your Connect comment'],
 ['You were mentioned in Lab Market','You were mentioned in Mettelo Connect'],
 ['You have a new Market message','You have a new Connect message'],
 ['Current Market collaboration required','Current Connect collaboration required'],
 ['Unsupported Market action','Unsupported Connect action'],
 ['Market membership must preserve its independent admission route','Connect membership must preserve its independent admission route']
]);
export function connectSystemCopy(value){return legacy.get(value)||value;}
export function collaborationActionNotice(action){return ({
 preferences:'Sharing preferences saved.',capacity:'Collaborator capacity saved.',recruitment:'Recruitment settings saved.',
 request:'Collaboration request sent.',invite:'Collaboration invitation sent.',decline:'Collaboration request declined.',withdraw:'Collaboration request withdrawn.',
 accept:'Collaboration accepted. Lab access is ready; external repository access is handled separately.',remove:'Collaboration access ended. Any required external revocation is tracked separately.'
 })[action]||'Connect update saved.';}
