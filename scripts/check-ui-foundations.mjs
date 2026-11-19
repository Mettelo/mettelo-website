import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url),read=file=>readFileSync(new URL(file,root),'utf8');
for(const [source,snapshot] of [['tokens.css','apps/member/app/design-tokens.css'],['shared/ui-foundations.css','apps/member/app/ui-foundations.css'],['shared/ui-icons.json','apps/member/components/ui-icons.snapshot.json']])assert.equal(read(source),read(snapshot),`Shared design drift: ${snapshot}`);
const icons=JSON.parse(read('shared/ui-icons.json')),navigation=JSON.parse(read('shared/navigation.json'));
assert.equal(icons.library,'lucide-react');
for(const [name,markup] of Object.entries(navigation.icons))assert.equal(markup,icons.icons[name],`Public icon differs: ${name}`);
for(const [name,markup] of Object.entries(icons.icons)){
 assert.match(markup,/<(?:path|circle|rect|polygon|line|ellipse|polyline)\b/,name);
 assert.doesNotMatch(markup,/<(?:script|image|foreignObject)\b|\bon\w+=|href=|style=/i,`Unsafe icon markup: ${name}`);
}
const tokens=Object.fromEntries([...read('tokens.css').matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map(m=>[m[1],m[2]]));
const luminance=hex=>{const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
const ratio=(a,b)=>{const x=luminance(tokens[a]),y=luminance(tokens[b]);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
for(const text of ['navy','muted','gold-text','success','danger','warning'])for(const surface of ['white','surface','surface-soft'])assert.ok(ratio(text,surface)>=4.5,`${text} on ${surface} must meet normal-text AA contrast`);
for(const colour of ['control-border','focus'])assert.ok(ratio(colour,'white')>=3,`${colour} must be distinguishable on white`);
assert.match(read('scripts/package-hostinger.mjs'),/shared\/ui-foundations\.css/);
assert.doesNotMatch(read('apps/member/components/MemberProfileForm.tsx'),/matches the last loaded version/);
console.log(`Design foundations passed: static/React parity, ${Object.keys(icons.icons).length} safe Lucide icons and 20 contrast pairs.`);
