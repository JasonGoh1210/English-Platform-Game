<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

try {
    $db = epq_db();
    $result = $db->query("SELECT DATABASE() AS db_name");
    $row = $result ? $result->fetch_assoc() : null;

    epq_json([
        'ok' => true,
        'php' => PHP_VERSION,
        'database' => $row['db_name'] ?? null,
        'message' => 'PHP + MySQL connection is working.'
    ]);
} catch (Throwable $e) {
    epq_json([
        'ok' => false,
        'php' => PHP_VERSION,
        'message' => $e->getMessage()
    ], 500);
}
