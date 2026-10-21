<?php
declare(strict_types=1);

function waitlist_validate(array $data): ?array {
    if (!is_string($data['name'] ?? null) || !is_string($data['email'] ?? null)) return null;
    $name = trim($data['name']);
    $email = trim($data['email']);
    if ($name === '' || strlen($name) > 160 || preg_match('/[\x00-\x1F\x7F]/', $name)) return null;
    if (strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/', $email)) return null;
    if (($data['consent'] ?? false) !== true || !is_string($data['website'] ?? null) || $data['website'] !== '') return null;
    return ['name' => $name, 'email' => $email];
}

// An exclusive lock makes per-network and global limits safe under concurrent requests.
// A keyed hash avoids retaining the raw network address. Records expire after one day.
function waitlist_send(array $config, array $entry, string $address, callable $send): string {
    $directory = $config['storage'];
    if (!is_dir($directory) && !@mkdir($directory, 0700, true)) return 'unavailable';
    $lock = @fopen($directory . '/state.json', 'c+');
    if (!$lock || !flock($lock, LOCK_EX)) { if ($lock) fclose($lock); return 'unavailable'; }
    try {
        $raw = stream_get_contents($lock);
        $state = $raw === '' ? ['secret' => bin2hex(random_bytes(32)), 'networks' => [], 'day' => '', 'count' => 0] : json_decode($raw, true);
        if (!is_array($state) || !isset($state['secret'], $state['networks'], $state['day'], $state['count'])) return 'unavailable';
        $now = time();
        $state['networks'] = array_filter($state['networks'], fn($item) => is_array($item) && ($item['time'] ?? 0) > $now - 86400);
        $key = hash_hmac('sha256', $address, $state['secret']);
        $network = $state['networks'][$key] ?? ['time' => $now, 'count' => 0];
        if ($network['time'] <= $now - 900) $network = ['time' => $now, 'count' => 0];
        if ($state['day'] !== gmdate('Y-m-d')) { $state['day'] = gmdate('Y-m-d'); $state['count'] = 0; }
        if ($network['count'] >= 3 || $state['count'] >= 90) return 'limited';
        // Count attempts as well as successful queues, preventing abuse during transport faults.
        $network['count']++;
        $state['networks'][$key] = $network;
        $state['count']++;
        $encoded = json_encode($state, JSON_THROW_ON_ERROR);
        rewind($lock);
        if (!ftruncate($lock, 0) || fwrite($lock, $encoded) !== strlen($encoded) || !fflush($lock)) return 'unavailable';
        @chmod($directory . '/state.json', 0600);
        $message = "Mettelo platform launch waitlist request\n\nName: " . $entry['name'] . "\nEmail: " . $entry['email'] . "\nConsent: Requested Mettelo platform launch updates.\nReceived (UTC): " . gmdate('c') . "\n\nThis is not a community membership application.\n";
        $headers = ['From' => 'Mettelo <' . $config['sender'] . '>', 'Content-Type' => 'text/plain; charset=UTF-8'];
        return $send($config['recipient'], 'Mettelo platform waitlist request', $message, $headers) ? 'queued' : 'unavailable';
    } finally { flock($lock, LOCK_UN); fclose($lock); }
}
