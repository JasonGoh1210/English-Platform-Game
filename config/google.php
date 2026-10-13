<?php
declare(strict_types=1);
function epq_google_client_id(): string {
    $configured = getenv('EPQ_GOOGLE_CLIENT_ID');
    if ($configured !== false && trim($configured) !== '') return trim($configured);
    $localPath = __DIR__.'/google.local.php';
    $local = is_file($localPath) ? require $localPath : [];
    return is_array($local) ? trim((string)($local['client_id'] ?? '')) : '';
}
