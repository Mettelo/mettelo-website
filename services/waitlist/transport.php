<?php
declare(strict_types=1);
function waitlist_api_send(array $config, string $to, string $subject, string $message): bool {
    $tokenFile = $config['token_file'] ?? '';
    if (!function_exists('curl_init') || !is_readable($tokenFile)) return false;
    $token = trim((string)file_get_contents($tokenFile));
    if ($token === '' || preg_match('/[\r\n]/', $token)) return false;
    $curl = curl_init('https://api.mail.hostinger.com/api/v1/mailboxes/' . rawurlencode($config['mailbox_id']) . '/send');
    curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode(['to' => [$to], 'subject' => $subject, 'text' => $message, 'displayName' => 'Mettelo'], JSON_THROW_ON_ERROR),
        CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token, 'Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 25,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
    ]);
    curl_exec($curl);
    $status = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    $errno = curl_errno($curl);
    $log = $config['storage'] . '/transport-status.json';
    @file_put_contents($log, json_encode(['status' => $status, 'curl_errno' => $errno, 'at' => gmdate('c')]), LOCK_EX);
    @chmod($log, 0600);
    curl_close($curl);
    return $status === 204;
}
