<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow');
function respond(int $status, array $body): never { http_response_code($status); echo json_encode($body); exit; }
$config = require __DIR__ . '/config.php';
$ready = $config['enabled'] === true && filter_var($config['recipient'], FILTER_VALIDATE_EMAIL) && filter_var($config['sender'], FILTER_VALIDATE_EMAIL);
if ($_SERVER['REQUEST_METHOD'] === 'GET') respond(200, ['available' => (bool)$ready]);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { header('Allow: GET, POST'); respond(405, ['message' => 'Method not allowed.']); }
if (!$ready) respond(503, ['message' => 'The waitlist is not accepting submissions yet. Please check back soon.']);
// JSON plus an explicit origin check prevents cross-site browser form submissions.
if (!in_array($_SERVER['HTTP_ORIGIN'] ?? '', $config['origins'], true)) respond(403, ['message' => 'Please submit from the Mettelo website.']);
if (strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0])) !== 'application/json') respond(415, ['message' => 'Unsupported request format.']);
if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 4096) respond(413, ['message' => 'Request too large.']);
$raw = file_get_contents('php://input', false, null, 0, 4097);
if ($raw === false || strlen($raw) > 4096) respond(413, ['message' => 'Request too large.']);
$data = json_decode($raw, true);
require __DIR__ . '/handler.php';
$entry = is_array($data) ? waitlist_validate($data) : null;
if (!$entry) respond(422, ['message' => 'Enter your name, a valid email and confirm launch updates.']);
try { $result = waitlist_send($config, $entry, $_SERVER['REMOTE_ADDR'] ?? 'unknown', fn($to, $subject, $message, $headers) => @mail($to, $subject, $message, $headers)); }
catch (Throwable $error) { $result = 'unavailable'; }
if ($result === 'limited') { header('Retry-After: 900'); respond(429, ['message' => 'The waitlist is busy or this network has reached its limit. Please try again later.']); }
if ($result !== 'queued') respond(503, ['message' => 'We could not send your request. Please try again later.']);
respond(202, ['message' => 'Your waitlist request has been sent to Mettelo. Thank you for your interest.']);
