<?php
declare(strict_types=1);
function epq_google_valid_client_id(string $value): bool {
    return strlen($value)<=256 && preg_match('/\A[0-9]+(?:-[A-Za-z0-9_-]+)?\.apps\.googleusercontent\.com\z/D',$value)===1;
}
function epq_google_client_id(): string {
    $configured = getenv('EPQ_GOOGLE_CLIENT_ID');
    if ($configured !== false && trim($configured) !== '') return epq_google_valid_client_id(trim($configured))?trim($configured):'';
    $localPath = __DIR__.'/google.local.php';
    $local = is_file($localPath) ? require $localPath : [];
    $value=is_array($local)&&is_string($local['client_id']??null)?trim($local['client_id']):'';
    return epq_google_valid_client_id($value)?$value:'';
}
