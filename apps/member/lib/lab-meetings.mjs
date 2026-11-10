export function safeMeetingUrl(value){try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.href.length>1000||!u.hostname.includes('.')||u.hostname==='localhost'||/^[\d.]+$/.test(u.hostname)||u.hostname.startsWith('[')||u.hostname.endsWith('.local'))return null;return u.href;}catch{return null;}}
export function meetingInstant(local,timeZone){
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local))throw Error('Choose a valid date and time.');
 let formatter;try{formatter=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});}catch{throw Error('Use a recognised time zone, for example Europe/London.');}
 const approximate=Date.parse(local+'Z');if(!Number.isFinite(approximate))throw Error('Choose a valid date and time.');const matches=[];
 for(let offset=-840;offset<=840;offset+=15){const instant=new Date(approximate+offset*60000);const p=Object.fromEntries(formatter.formatToParts(instant).map(x=>[x.type,x.value]));if(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`===local)matches.push(instant.toISOString());}
 if(matches.length!==1)throw Error(matches.length?'That local time occurs twice during a clock change. Choose an unambiguous time.':'That local time does not exist. Check the date and daylight-saving time.');return matches[0];
}
export function normaliseMeeting(input,now=Date.now()){
 const topic=String(input.topic||'').trim(),agenda=String(input.agenda||'').trim(),url=safeMeetingUrl(String(input.join_url||''));
 if(topic.length<5||topic.length>180||agenda.length>3000||!url)throw Error('Add a topic (5–180 characters), a safe HTTPS meeting link and a short agenda.');
 const start=meetingInstant(String(input.local_start||''),String(input.time_zone||'')),minutes=Number(input.duration);
 if(Date.parse(start)<=now||!Number.isInteger(minutes)||minutes<5||minutes>1440)throw Error('Choose a future meeting and a duration of 5 minutes to 24 hours.');
 return {topic,agenda,join_url:url,starts_at:start,ends_at:new Date(Date.parse(start)+minutes*60000).toISOString(),time_zone:String(input.time_zone)};
}
const escapeHtml=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icsText=v=>String(v).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
const stamp=v=>new Date(v).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
export function meetingEmail(job){
 const e=job.meeting,url=safeMeetingUrl(e.join_url);if(!url)throw Error('Unsafe meeting link.');
 let zone=job.recipient_time_zone||e.time_zone;try{new Intl.DateTimeFormat('en-GB',{timeZone:zone}).format();}catch{zone=e.time_zone;}
 const time=new Intl.DateTimeFormat('en-GB',{timeZone:zone,dateStyle:'full',timeStyle:'short'}).format(new Date(e.starts_at));
 const label=job.kind==='cancelled'?'Meeting cancelled':job.kind==='updated'?'Meeting updated':'Meeting invitation';
 const body=`${label}: ${e.topic}\n${job.project_ref} · ${job.team_label}\n${time} (${zone})\n${e.agenda||''}\n${job.kind==='cancelled'?'This meeting has been cancelled.':`Join: ${url}`}\nView your Lab for the latest details.`;
 const html=`<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#141925"><div style="background:#141925;color:#fff;padding:24px;font-size:24px;font-weight:bold">Mettelo Lab</div><div style="padding:24px;border:1px solid #ddd7cb"><p>${escapeHtml(label)}</p><h1 style="font-size:24px">${escapeHtml(e.topic)}</h1><p>${escapeHtml(job.project_ref)} · ${escapeHtml(job.team_label)}</p><p><strong>${escapeHtml(time)} (${escapeHtml(zone)})</strong></p><p style="white-space:pre-wrap">${escapeHtml(e.agenda||'')}</p>${job.kind==='cancelled'?'<p>This meeting has been cancelled.</p>':`<p><a style="display:inline-block;background:#141925;color:white;padding:14px 20px;border-radius:8px" href="${escapeHtml(url)}">Join meeting</a></p>`}<p>Open your Mettelo Lab for the latest details.</p></div></div>`;
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Mettelo//Lab meetings//EN',`METHOD:${job.kind==='cancelled'?'CANCEL':'REQUEST'}`,'BEGIN:VEVENT',`UID:${e.id}@mettelo.com`,`SEQUENCE:${e.revision}`,`DTSTAMP:${stamp(e.updated_at)}`,`DTSTART:${stamp(e.starts_at)}`,`DTEND:${stamp(e.ends_at)}`,`SUMMARY:${icsText(e.topic)}`,`DESCRIPTION:${icsText(body)}`,`URL:${url}`,`STATUS:${job.kind==='cancelled'?'CANCELLED':'CONFIRMED'}`,'END:VEVENT','END:VCALENDAR'];
 const folded=lines.map(line=>{let output='',n=0;for(const char of line){const bytes=new TextEncoder().encode(char).length;if(n+bytes>73){output+='\r\n ';n=1;}output+=char;n+=bytes;}return output;}).join('\r\n')+'\r\n';
 return {subject:`${label}: ${e.topic}`.replace(/[\r\n]/g,' '),text:body,html,calendar:folded,idempotencyKey:`lab-meeting-${job.id}`};
}
