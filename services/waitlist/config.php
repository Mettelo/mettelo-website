<?php
declare(strict_types=1);
return [
    // Enable only after the collection notice is approved and Hostinger delivery is tested.
    'enabled' => false,
    'recipient' => 'hello@mettelo.com',
    'sender' => 'no-reply@mettelo.com',
    'mailbox_id' => 'ACc93e2feddc241640f4874fcf91f3',
    'token_file' => dirname(__DIR__, 2) . '/.mettelo-mail-token',
    'origins' => ['https://mettelo.com', 'https://www.mettelo.com'],
    // Must remain outside public_html. Contains abuse counters, never names or emails.
    'storage' => dirname(__DIR__, 2) . '/.mettelo-waitlist',
];
