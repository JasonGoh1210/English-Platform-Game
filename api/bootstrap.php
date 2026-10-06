<?php
declare(strict_types=1);
session_start();
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/db.php';

function epq_json(array $payload, int $status = 200): never {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function epq_demo_player_id(mysqli $db): int {
    $result = $db->query(
        "SELECT p.player_id
         FROM players p
         INNER JOIN users u ON u.user_id = p.user_id
         WHERE u.username = 'demo'
         LIMIT 1"
    );

    if (!$result) throw new RuntimeException('Unable to query demo player.');
    $row = $result->fetch_assoc();

    if (!$row) {
        throw new RuntimeException(
            'Demo player not found. Import database/english_power_quest_schema.sql then database/demo_seed.sql.'
        );
    }

    return (int)$row['player_id'];
}

function epq_body(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    if (!is_array($data)) epq_json(['ok' => false, 'error' => 'Invalid JSON.'], 400);
    return $data;
}
