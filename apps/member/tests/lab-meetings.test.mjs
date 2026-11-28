import test from 'node:test';
import assert from 'node:assert/strict';
import {meetingInstant,normaliseMeeting,safeMeetingUrl,meetingEmail} from '../lib/lab-meetings.mjs';
import {runMeetingMail} from '../lib/lab-mail-runner.mjs';
const job={id:'job-a',email:'controlled@example.test',kind:'invitation',project_ref:'P',team_label:'Demo team',meeting:{id:'meeting-a',revision:1,topic:'Planning <review>',agenda:'Review tasks & dependencies.',starts_at:'2027-01-10T19:00:00Z',ends_at:'2027-01-10T20:00:00Z',time_zone:'Europe/London',join_url:'https://meet.google.com/abc-defg-hij',updated_at:'2027-01-01T12:00:00Z'}};
test('meeting time conversion handles zones and rejects nonexistent or ambiguous DST times',()=>{
 assert.equal(meetingInstant('2027-01-10T19:00','Europe/London'),'2027-01-10T19:00:00.000Z');
 assert.equal(meetingInstant('2027-07-10T19:00','Europe/London'),'2027-07-10T18:00:00.000Z');
 assert.throws(()=>meetingInstant('2027-03-28T01:30','Europe/London'),/does not exist/);
 assert.throws(()=>meetingInstant('2027-10-31T01:30','Europe/London'),/occurs twice/);
 assert.throws(()=>meetingInstant('2027-02-30T12:00','UTC'),/does not exist/);
});
test('unsafe meeting URLs and invalid durations are rejected',()=>{
 for(const link of ['javascript:alert(1)','http://example.com','https://user:pass@example.com','https://127.0.0.1/a','https://localhost/a','https://[::1]/'])assert.equal(safeMeetingUrl(link),null);
 assert.throws(()=>normaliseMeeting({topic:'Weekly planning',local_start:'2027-01-10T19:00',time_zone:'UTC',duration:0,join_url:job.meeting.join_url},0),/duration/);
 assert.equal(normaliseMeeting({topic:'Weekly planning',local_start:'2027-01-10T19:00',time_zone:'UTC',duration:60,join_url:job.meeting.join_url},0).ends_at,'2027-01-10T20:00:00.000Z');
});
test('meeting emails escape content and preserve calendar identity across updates and cancellation',()=>{
 const first=meetingEmail(job),updated=meetingEmail({...job,kind:'updated',meeting:{...job.meeting,revision:2}}),cancelled=meetingEmail({...job,kind:'cancelled',meeting:{...job.meeting,revision:3}});
 assert.match(first.html,/Planning &lt;review&gt;/);assert.match(first.calendar,/UID:meeting-a@mettelo.com/);assert.match(updated.calendar,/SEQUENCE:2/);assert.match(cancelled.calendar,/METHOD:CANCEL/);assert.doesNotMatch(cancelled.html,/>Join meeting</);
});
test('disabled meeting runner makes no database or provider calls',async()=>{
 let calls=0;const result=await runMeetingMail({rpc:async()=>{calls++},send:async()=>{calls++}});assert.equal(result.disabled,true);assert.equal(calls,0);
});
test('recipient restrictions prevent a queued email from escaping the staging allowlist',async()=>{
 let sends=0;const completed=[];await runMeetingMail({enabled:true,from:'Mettelo <sender@example.test>',allowedRecipients:['other@example.test'],limit:1,rpc:async(action,p)=>action==='complete'?completed.push(p):job,send:async()=>{sends++}});
 assert.equal(sends,0);assert.equal(completed[0].state,'skipped');
});
test('provider uncertainty is recorded as unknown and never automatically retried',async()=>{
 const completed=[];await runMeetingMail({enabled:true,from:'Mettelo <sender@example.test>',allowedRecipients:[job.email],limit:1,rpc:async(action,p)=>action==='complete'?completed.push(p):job,send:async()=>{throw Error('Timeout')}});assert.equal(completed[0].state,'unknown');
});
test('membership is rechecked immediately before sending and removed recipients are skipped',async()=>{
 let sends=0;await runMeetingMail({enabled:true,from:'sender@example.test',allowedRecipients:[job.email],limit:1,rpc:async(action)=>action==='claim'?job:{skipped:true},send:async()=>{sends++}});assert.equal(sends,0);
});
