<?php
declare(strict_types=1);
require_once __DIR__ . '/includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit('POST required.');
}
$csrf = (string)($_POST['csrf_token'] ?? '');
if (!epq_csrf_is_valid($csrf)) {
    http_response_code(403);
    exit('Invalid request token.');
}

// Explicit logout revokes persistent guest recovery; simply closing the browser does not.
if (epq_is_guest()) {
    try { epq_guest_revoke_tokens(epq_db(), (int)$_SESSION['user_id']); }
    catch (Throwable $e) { error_log('[English Power Quest logout] ' . $e->getMessage()); }
}
epq_clear_guest_cookie();
$_SESSION = [];
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
}
session_destroy();
header('Location: /FYP/login.php');
exit;
