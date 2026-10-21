<?php
declare(strict_types=1);
require __DIR__ . '/../waitlist/handler.php';
function check(bool $condition, string $message): void { if (!$condition) throw new RuntimeException($message); }
$entry = ['name' => 'Test Member', 'email' => 'test@example.test', 'consent' => true, 'website' => ''];
check(waitlist_validate($entry) !== null, 'valid entry');
foreach ([['name' => ''], ['name' => "Header\r\nInjection"], ['name' => []], ['email' => 'bad-address'], ['email' => "test@example.test\r\nBcc: bad@example.test"], ['consent' => false], ['consent' => 'true'], ['website' => 'bot']] as $invalid) check(waitlist_validate(array_replace($entry, $invalid)) === null, 'reject invalid entry');
$dir = sys_get_temp_dir() . '/mettelo-waitlist-test-' . bin2hex(random_bytes(8));
$config = ['storage' => $dir, 'recipient' => 'hello@mettelo.com', 'sender' => 'hello@mettelo.com'];
$sent = 0;
$fake = function($to, $subject, $body, $headers) use (&$sent): bool { check($to === 'hello@mettelo.com', 'destination'); check(str_contains($body, 'Consent:'), 'consent record'); check(!isset($headers['Reply-To']), 'no user header injection'); $sent++; return true; };
try {
 for($i=0;$i<3;$i++) check(waitlist_send($config,$entry,'192.0.2.1',$fake)==='queued','accept within limit');
 check(waitlist_send($config,$entry,'192.0.2.1',$fake)==='limited','network rate limit');
 check($sent===3,'limited request must not send');
 check(waitlist_send($config,$entry,'192.0.2.2',fn()=>false)==='unavailable','mail failure is not success');
 $raw=file_get_contents($dir.'/state.json');
 check(!str_contains($raw,'test@example.test')&&!str_contains($raw,'Test Member')&&!str_contains($raw,'192.0.2.1'),'no identity or raw network retained');
 $state=json_decode($raw,true);$state['count']=90;file_put_contents($dir.'/state.json',json_encode($state));
 check(waitlist_send($config,$entry,'192.0.2.3',$fake)==='limited','global cap');
 file_put_contents($dir.'/state.json','invalid');
 check(waitlist_send($config,$entry,'192.0.2.4',$fake)==='unavailable','corrupt counter fails closed');
} finally { if(file_exists($dir.'/state.json'))unlink($dir.'/state.json'); if(is_dir($dir))rmdir($dir); }
echo "Waitlist validation, consent, injection, rate limits, private counter state and failed transport checks passed. No email sent.\n";
