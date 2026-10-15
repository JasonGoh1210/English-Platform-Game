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
    ['iat'=>1700],['sub'=>''],['email_verified'=>false],['azp'=>'another-client'],['aud'=>[$claims['aud']]],
    ['exp'=>'2000'],['iat'=>'1000'],['iat'=>1500,'exp'=>1500],['nbf'=>1601],['nbf'=>'1000']];
foreach($cases as $patch){$rejected=false;try{epq_verify_google_token(signed(array_replace($claims,$patch)),$certificates,$claims['aud'],$claims['nonce'],1500);}catch(DomainException $e){$rejected=true;}gcheck($rejected,'Invalid signed claim rejected');}
foreach([signed($claims,['alg'=>'none','kid'=>'fixture']),signed($claims,['alg'=>'HS256','kid'=>'fixture']),
    signed($claims,['alg'=>'RS256','kid'=>'unknown']),'invalid.token.value',str_repeat('x',17000),substr($valid,0,-6).'AAAAAA'] as $token){
    $rejected=false;try{epq_verify_google_token($token,$certificates,$claims['aud'],$claims['nonce'],1500);}catch(DomainException $e){$rejected=true;}gcheck($rejected,'Invalid signature/header/encoding rejected');
}
foreach(['星澜','Arin Vale',"O'Neil",str_repeat('星',24)] as $name)gcheck(epq_valid_character_name($name),'Unicode character name');
foreach(['A',str_repeat('星',25),'<script>','bad/name'] as $name)gcheck(!epq_valid_character_name($name),'Invalid character name');
foreach(epq_character_names() as $pool) {
    gcheck(count($pool)===1600&&count(array_unique($pool))===1600,'Expanded name pool is unique');
    foreach($pool as $name)gcheck(epq_valid_character_name($name),'Every random name passes server validation');
}
$_SESSION=[];$request=epq_google_request('login');gcheck(strlen($request['nonce'])===64&&$request['user_id']===0,'Anonymous page nonce');
$_SESSION=['user_id'=>7,'player_id'=>8];$link=epq_google_request('link');gcheck($link['user_id']===7&&$link['player_id']===8,'Link binds session owner');
$rejected=false;try{epq_google_request('login');}catch(DomainException $e){$rejected=true;}gcheck($rejected,'Cannot silently switch logged-in owner');
$_SESSION=[];$first=epq_google_request('login');$second=epq_google_request('login');
gcheck($first['nonce']!==$second['nonce']&&epq_google_pending_request($first['id'])===$first,'Two tabs keep separate valid nonces');
for($i=0;$i<10;$i++)$last=epq_google_request('login');
gcheck(count($_SESSION['google_requests'])===8,'Pending requests stay bounded');
foreach([$first['id'],'wrong',str_repeat('f',32)] as $id){
    $rejected=false;try{epq_google_pending_request($id);}catch(DomainException $e){$rejected=true;}gcheck($rejected,'Unknown and evicted pages rejected');
}
gcheck(epq_google_pending_request(null)===$last,'Old open clients retain last-page compatibility');
foreach([$last['created']+600,$last['created']-61] as $now){
    $rejected=false;try{epq_google_pending_request($last['id'],$now);}catch(DomainException $e){$rejected=true;}gcheck($rejected,'Expired or future-dated request rejected');
}
$_SESSION['user_id']=7;$_SESSION['player_id']=8;
$rejected=false;try{epq_google_pending_request($last['id']);}catch(DomainException $e){$rejected=true;}gcheck($rejected,'Anonymous page cannot switch current owner');
$link=epq_google_request('link');gcheck(epq_google_pending_request($link['id'])===$link,'Owner can bind from their own page');
$_SESSION['player_id']=9;$rejected=false;try{epq_google_pending_request($link['id']);}catch(DomainException $e){$rejected=true;}gcheck($rejected,'Binding is scoped to original player');
$_SESSION['player_id']=8;epq_google_complete_request($link);
gcheck(epq_google_completed_request($link['id'])&&!isset($_SESSION['google_requests']),'Success consumes pending requests and supports recovery');
gcheck(!epq_google_completed_request(str_repeat('f',32))&&!epq_google_completed_request($link['id'],time()+301),'Recovery is scoped and expires');
$_SESSION['user_id']=9;gcheck(!epq_google_completed_request($link['id']),'Recovery cannot cross session owners');
gcheck(epq_google_valid_client_id('1234567890-valid_web.apps.googleusercontent.com'),'Valid public web Client ID');
foreach(['','example.apps.googleusercontent.com','http://localhost','123.apps.googleusercontent.com.attacker.invalid',"123.apps.googleusercontent.com\n"] as $id)gcheck(!epq_google_valid_client_id($id),'Invalid Client ID disabled');
gcheck(epq_google_cache_seconds('public, max-age=3600',200)===3400,'Google cache lifetime respects Age');
gcheck(epq_google_cache_seconds('max-age=999999')===86400,'Cache lifetime bounded');
foreach(['private, no-store, max-age=100','no-cache, max-age=100','public','max-age=0'] as $control)gcheck(epq_google_cache_seconds($control)===0,'Uncacheable responses not cached');
$cache=['fetched'=>1500,'expires'=>2000,'keys'=>$certificates];
gcheck(epq_google_cached_certificates($cache,'fixture',1501)===$certificates,'Fresh Google key reused');
gcheck(epq_google_cached_certificates($cache,'rotated',1559)===$certificates,'Unknown key probe bounded');
gcheck(epq_google_cached_certificates($cache,'rotated',1560)===null,'Unknown key refreshes after rotation interval');
gcheck(epq_google_cached_certificates($cache,null,2000)===null,'Expired Google keys rejected');
gcheck(epq_google_cached_certificates(array_replace($cache,['fetched'=>1700]),null,1500)===null,'Future cache rejected');
gcheck(epq_google_cached_certificates(array_replace($cache,['keys'=>[]]),null,1500)===null,'Empty key set rejected');
echo "PASS: Google signed claims, multi-tab/owner/expiry protection, recovery receipts, Client IDs, key caching and character names\n";
