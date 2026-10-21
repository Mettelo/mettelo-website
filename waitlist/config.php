<?php
declare(strict_types=1);
return [
    // Enable only after the collection notice is approved and Hostinger delivery is tested.
    'enabled' => false,
    'recipient' => 'hello@mettelo.com',
    'sender' => 'hello@mettelo.com',
    'origins' => ['https://mettelo.com', 'https://www.mettelo.com'],
    // Must remain outside public_html. Contains abuse counters, never names or emails.
    'storage' => dirname(__DIR__, 2) . '/.mettelo-waitlist',
];
