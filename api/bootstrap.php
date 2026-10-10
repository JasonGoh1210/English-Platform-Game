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

function epq_current_player_id(mysqli $db): int {
    if (empty($_SESSION['user_id'])) {
        epq_json(['ok' => false, 'error' => 'Please log in first.'], 401);
    }

    $userId = (int)$_SESSION['user_id'];
    $stmt = $db->prepare("SELECT player_id FROM players WHERE user_id = ? LIMIT 1");
    if (!$stmt) throw new RuntimeException('Unable to prepare current-player query.');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();

    if (!$row) {
        unset($_SESSION['user_id'], $_SESSION['player_id']);
        epq_json(['ok' => false, 'error' => 'Player profile not found. Please register or log in again.'], 401);
    }

    $playerId = (int)$row['player_id'];
    $_SESSION['player_id'] = $playerId;
    return $playerId;
}

function epq_body(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    if (!is_array($data)) epq_json(['ok' => false, 'error' => 'Invalid JSON.'], 400);
    return $data;
}
