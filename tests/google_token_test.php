<?php
declare(strict_types=1);
require_once __DIR__.'/../includes/google.php';
require_once __DIR__.'/../includes/characters.php';
function gcheck(bool $ok,string $label):void {if(!$ok)throw new RuntimeException($label);}
function g64(string $value):string{return rtrim(strtr(base64_encode($value),'+/','-_'),'=');}
$options=['private_key_bits'=>2048,'private_key_type'=>OPENSSL_KEYTYPE_RSA];
if(is_file('C:/xampp/apache/conf/openssl.cnf'))$options['config']='C:/xampp/apache/conf/openssl.cnf';
$key=openssl_pkey_new($options);gcheck($key!==false,'Test RSA key');
$certificates=['fixture'=>openssl_pkey_get_details($key)['key']];
$claims=['iss'=>'https://accounts.google.com','aud'=>'fixture.apps.googleusercontent.com','iat'=>1000,'exp'=>2000,
    'sub'=>'verified-subject','nonce'=>'nonce-for-this-page','email'=>'fixture@example.com','email_verified'=>true];
function signed(array $claims,array $header=['alg'=>'RS256','kid'=>'fixture']):string {
    global $key;$payload=g64(json_encode($header)).'.'.g64(json_encode($claims));
    openssl_sign($payload,$signature,$key,OPENSSL_ALGO_SHA256);return $payload.'.'.g64($signature);
}
$valid=signed($claims);
gcheck(epq_verify_google_token($valid,$certificates,$claims['aud'],$claims['nonce'],1500)['sub']==='verified-subject','Signed identity');
$cases=[['aud'=>'another-client'],['iss'=>'https://attacker.invalid'],['exp'=>1499],['nonce'=>'another-page'],
    ['iat'=>1700],['sub'=>''],['email_verified'=>false],['azp'=>'another-client'],['aud'=>[$claims['aud']]]];
foreach($cases as $patch){$rejected=false;try{epq_verify_google_token(signed(array_replace($claims,$patch)),$certificates,$claims['aud'],$claims['nonce'],1500);}catch(DomainException $e){$rejected=true;}gcheck($rejected,'Invalid signed claim rejected');}
foreach([signed($claims,['alg'=>'none','kid'=>'fixture']),signed($claims,['alg'=>'HS256','kid'=>'fixture']),
    signed($claims,['alg'=>'RS256','kid'=>'unknown']),'invalid.token.value',str_repeat('x',17000),substr($valid,0,-6).'AAAAAA'] as $token){
    $rejected=false;try{epq_verify_google_token($token,$certificates,$claims['aud'],$claims['nonce'],1500);}catch(DomainException $e){$rejected=true;}gcheck($rejected,'Invalid signature/header/encoding rejected');
}
foreach(['星澜','Arin Vale',"O'Neil",str_repeat('星',24)] as $name)gcheck(epq_valid_character_name($name),'Unicode character name');
foreach(['A',str_repeat('星',25),'<script>','bad/name'] as $name)gcheck(!epq_valid_character_name($name),'Invalid character name');
$_SESSION=[];$request=epq_google_request('login');gcheck(strlen($request['nonce'])===64&&$request['user_id']===0,'Anonymous page nonce');
$_SESSION=['user_id'=>7,'player_id'=>8];$link=epq_google_request('link');gcheck($link['user_id']===7&&$link['player_id']===8,'Link binds session owner');
$rejected=false;try{epq_google_request('login');}catch(DomainException $e){$rejected=true;}gcheck($rejected,'Cannot silently switch logged-in owner');
echo "PASS: Google RSA signatures, issuer, audience, expiry, nonce, claim types, forged tokens and character names\n";
