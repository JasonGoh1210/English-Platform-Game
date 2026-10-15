<?php
declare(strict_types=1);
// Read-only diagnostics. Never expose configuration diagnostics as a web page.
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require_once __DIR__.'/../includes/google.php';
$failed=false;
foreach(['curl','openssl','mysqli'] as $extension){
    $loaded=extension_loaded($extension);$failed=$failed||!$loaded;
    echo ($loaded?'OK  ':'FAIL')." PHP $extension\n";
}
$configured=epq_google_client_id()!=='';
echo $configured?"OK   Web Client ID configured\n":"TODO Create a Google Web application Client ID; set config/google.local.php or EPQ_GOOGLE_CLIENT_ID.\n";
echo "XAMPP origin: http://localhost (no /FYP path; add the actual port when using a different port).\n";
echo "Setup: https://console.cloud.google.com/auth/clients\n";
if(!$failed&&!in_array('--offline',$argv,true)){
    try{echo 'OK   Google verification HTTPS connection; '.count(epq_google_certificates())." public keys available\n";}
    catch(Throwable $e){echo "FAIL Google verification HTTPS connection; check network and PHP CA certificates.\n";$failed=true;}
}
echo "No player database was opened or modified. A Client Secret is not used.\n";
exit($failed?1:($configured?0:2));
