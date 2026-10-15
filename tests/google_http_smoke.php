<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
// Controlled RSA fixtures, never a Google account or a production-session bypass.
$fixtureId='1234567890-fixture.apps.googleusercontent.com';
$sessionPath=realpath((string)getenv('EPQ_GOOGLE_TEST_SESSION_PATH'));
if(getenv('EPQ_BATTLE_TEST_DB')!=='isolated'||getenv('EPQ_GOOGLE_CLIENT_ID')!==$fixtureId
    ||!$sessionPath||realpath(session_save_path())!==$sessionPath
    ||!str_starts_with(basename($sessionPath),'epq-google-sessions-')){
    throw new RuntimeException('Dedicated isolated database, fixture Client ID and private PHP session directory required.');
}
require_once __DIR__.'/../config/db.php';
require_once __DIR__.'/../includes/google.php';
require_once __DIR__.'/../includes/guest.php';
require_once __DIR__.'/../includes/characters.php';
function ghcheck(bool $ok,string $label):void{if(!$ok)throw new RuntimeException($label);}
function ghhttp(string $path,?array $body,string $cookie):array{
    $curl=curl_init('http://127.0.0.1:8081/FYP/'.$path);
    curl_setopt_array($curl,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_COOKIEFILE=>$cookie,CURLOPT_COOKIEJAR=>$cookie,CURLOPT_TIMEOUT=>20]);
    if($body!==null){curl_setopt($curl,CURLOPT_POST,true);
        if(str_starts_with($path,'api/')){curl_setopt($curl,CURLOPT_HTTPHEADER,['Content-Type: application/json']);curl_setopt($curl,CURLOPT_POSTFIELDS,json_encode($body));}
        else curl_setopt($curl,CURLOPT_POSTFIELDS,http_build_query($body));
    }
    $text=curl_exec($curl);$status=(int)curl_getinfo($curl,CURLINFO_RESPONSE_CODE);curl_close($curl);
    ghcheck(is_string($text),'HTTP response received');
    return [$status,str_starts_with($path,'api/')?json_decode($text,true):$text];
}
function ghcsrf(string $page):string{preg_match('/name="csrf_token" value="([a-f0-9]{64})"/',$page,$m);ghcheck(isset($m[1]),'CSRF present');return $m[1];}
function ghconfig(string $page):array{preg_match('/window.EPQ_GOOGLE = (.+?);<\/script>/',$page,$m);$config=json_decode($m[1]??'',true);ghcheck(is_array($config),'Configured Google page');return $config;}
function ghcookie(string $cookie,string $name):string{
    foreach(file($cookie,FILE_IGNORE_NEW_LINES)?:[] as $line){$parts=explode("\t",$line);if(count($parts)===7&&$parts[5]===$name)return $parts[6];}
    throw new RuntimeException('Missing fixture cookie '.$name);
}
function ghcache(string $cookie):void{
    global $publicKey;
    $id=ghcookie($cookie,'PHPSESSID');ghcheck(preg_match('/\A[a-zA-Z0-9,-]+\z/D',$id)===1,'Valid isolated session ID');
    ghcheck(is_file(session_save_path().DIRECTORY_SEPARATOR.'sess_'.$id),'Existing isolated session');
    session_id($id);session_start();
    $_SESSION['google_certificates']=['fetched'=>time(),'expires'=>time()+3600,'keys'=>['fixture'=>$publicKey]];
    session_write_close();
}
function ghtoken(array $page,string $subject,string $email,array $patch=[]):string{
    global $key,$fixtureId;
    $encode=static fn(string $value):string=>rtrim(strtr(base64_encode($value),'+/','-_'),'=');
    $claims=array_replace(['iss'=>'https://accounts.google.com','aud'=>$fixtureId,'iat'=>time(),'exp'=>time()+3600,
        'sub'=>$subject,'nonce'=>$page['nonce'],'email'=>$email,'email_verified'=>true],$patch);
    $data=$encode(json_encode(['alg'=>'RS256','kid'=>'fixture'])).'.'.$encode(json_encode($claims));
    openssl_sign($data,$sig,$key,OPENSSL_ALGO_SHA256);return $data.'.'.$encode($sig);
}
function ghlogin(array $page,string $token,string $cookie,array $extra=[]):array{
    return ghhttp('api/google_login.php',array_replace(['credential'=>$token,'csrfToken'=>$page['csrfToken'],'requestId'=>$page['requestId']],$extra),$cookie);
}
function ghlogout(string $cookie):void{[, $map]=ghhttp('index.php',null,$cookie);ghcheck(ghhttp('logout.php',['csrf_token'=>ghcsrf($map)],$cookie)[0]===302,'Logout');}
$options=['private_key_bits'=>2048,'private_key_type'=>OPENSSL_KEYTYPE_RSA];
if(is_file('C:/xampp/apache/conf/openssl.cnf'))$options['config']='C:/xampp/apache/conf/openssl.cnf';
$key=openssl_pkey_new($options);ghcheck($key!==false,'RSA fixture key');$publicKey=openssl_pkey_get_details($key)['key'];
$db=epq_db();mysqli_report(MYSQLI_REPORT_ERROR|MYSQLI_REPORT_STRICT);
$cookies=[];$newCookie=static function()use(&$cookies):string{$path=tempnam(sys_get_temp_dir(),'epq_google_');$cookies[]=$path;return $path;};
$suffix=bin2hex(random_bytes(10));$subject='http-'.$suffix;$email=$subject.'@example.com';
try{
    $cookie=$newCookie();[, $login]=ghhttp('login.php',null,$cookie);$first=ghconfig($login);
    [, $another]=ghhttp('register.php',null,$cookie);$second=ghconfig($another);ghcache($cookie);
    ghcheck($first['nonce']!==$second['nonce'],'Tabs have separate nonces');
    foreach([['nonce'=>'wrong'],['aud'=>'wrong'],['exp'=>time()-1]] as $patch){
        ghcheck(ghlogin($first,ghtoken($first,$subject,$email,$patch),$cookie)[0]===409,'Signed invalid claims rejected without consuming page');
    }
    $valid=ghtoken($first,$subject,$email);
    ghcheck(ghlogin($first,$valid,$cookie,['csrfToken'=>'wrong'])[0]===403,'Google CSRF');
    ghcheck(ghlogin($first,substr($valid,0,-20).str_repeat('A',20),$cookie)[0]===409,'Forged signature rejected');
    $oldSession=ghcookie($cookie,'PHPSESSID');[$status,$result]=ghlogin($first,$valid,$cookie);
    ghcheck($status===200&&$result['redirect']==='/FYP/character_setup.php','First Google login from older tab');
    ghcheck($oldSession!==ghcookie($cookie,'PHPSESSID'),'Successful sign-in regenerates session');
    ghcheck(ghhttp('api/google_login.php?requestId='.$first['requestId'],null,$cookie)[1]['completed']===true,'Lost reply recovery sees committed login');
    ghcheck(ghhttp('api/google_login.php?requestId='.$second['requestId'],null,$cookie)[1]['completed']===false,'Another tab cannot claim success');
    ghcheck(ghhttp('api/player.php',null,$cookie)[0]===409,'New Google player must create character');
    [, $setup]=ghhttp('character_setup.php',null,$cookie);
    ghcheck(ghhttp('character_setup.php',['csrf_token'=>ghcsrf($setup),'display_name'=>'Google Fixture','gender'=>'female','appearance'=>'arcane'],$cookie)[0]===302,'Google character setup');
    $player=ghhttp('api/player.php',null,$cookie)[1]['player'];$playerId=$player['playerId'];
    ghlogout($cookie);
    ghcheck(ghhttp('api/google_login.php?requestId='.$first['requestId'],null,$cookie)[1]['completed']===false,'Logout clears recovery receipt');
    [, $login]=ghhttp('login.php',null,$cookie);$return=ghconfig($login);ghcache($cookie);
    ghcheck(ghlogin($return,ghtoken($return,$subject,$email),$cookie)[0]===200,'Returning Google login');
    ghcheck(ghhttp('api/player.php',null,$cookie)[1]['player']['playerId']===$playerId,'Same Google subject resumes same player');
    $other=$newCookie();[, $login]=ghhttp('login.php',null,$other);$otherPage=ghconfig($login);ghcache($other);
    ghcheck(ghlogin($otherPage,ghtoken($otherPage,'collision-'.$suffix,$email),$other)[0]===409,'Same email never silently merges identities');
    ghcheck(ghhttp('api/google_login.php?requestId='.$return['requestId'],null,$other)[1]['completed']===false,'Recovery scoped to browser session');

    $guest=$newCookie();[, $login]=ghhttp('login.php',null,$guest);
    ghhttp('login.php',['guest_mode'=>'1','csrf_token'=>ghcsrf($login)],$guest);
    $resume=ghcookie($guest,'epq_guest_resume');[, $setup]=ghhttp('character_setup.php',null,$guest);
    ghhttp('character_setup.php',['csrf_token'=>ghcsrf($setup),'display_name'=>'Bound Guest','gender'=>'male','appearance'=>'forest'],$guest);
    $before=ghhttp('api/player.php',null,$guest)[1]['player'];$guestId=(int)$before['playerId'];
    $db->query('UPDATE players SET xp_total=55,coins_total=500 WHERE player_id='.$guestId);
    [, $map]=ghhttp('index.php',null,$guest);$csrf=ghcsrf($map);
    foreach([['BUY','fox'],['EQUIP','fox'],['BUY','potion']] as [$action,$item]){
        ghcheck(ghhttp('api/shop.php',['csrfToken'=>$csrf,'action'=>$action,'item'=>$item,'requestId'=>bin2hex(random_bytes(16))],$guest)[0]===200,'Fixture shop purchase');
    }
    ghcheck(ghhttp('api/game_state.php',['csrfToken'=>$csrf,'state'=>['currentRealmId'=>'maple','playerX'=>720]],$guest)[0]===200,'Guest map save');
    $stateBefore=ghhttp('api/game_state.php',null,$guest)[1]['state'];$shopBefore=ghhttp('api/shop.php',null,$guest)[1]['shop'];
    [, $page]=ghhttp('account.php',null,$guest);$link=ghconfig($page);ghcache($guest);
    ghcheck(ghlogin($link,ghtoken($link,$subject,$email),$guest)[0]===409,'Cannot replace current guest with an existing Google player');
    ghcheck(ghhttp('api/player.php',null,$guest)[1]['player']['playerId']===$guestId,'Rejected binding retains original player');
    $guestSub='guest-'.$suffix;$guestMail=$guestSub.'@example.com';
    ghcheck(ghlogin($link,ghtoken($link,$guestSub,$guestMail),$guest)[0]===200,'Guest Google binding after conflict');
    $after=ghhttp('api/player.php',null,$guest)[1]['player'];
    ghcheck($after['playerId']===$guestId&&$after['displayName']==='Bound Guest'&&$after['xp']===55&&$after['coins']===448
        &&$after['character']===$before['character'],'Binding preserves character, outfit and balances');
    ghcheck(ghhttp('api/game_state.php',null,$guest)[1]['state']===$stateBefore,'Binding preserves map save');
    ghcheck(ghhttp('api/shop.php',null,$guest)[1]['shop']===$shopBefore,'Binding preserves owned skin, equipped guide and potion');
    ghcheck(str_contains(ghhttp('account.php',null,$guest)[1],'已绑定 Google'),'Account page confirms binding');
    $revoked=$newCookie();file_put_contents($revoked,"# Netscape HTTP Cookie File\n127.0.0.1\tFALSE\t/FYP/\tFALSE\t0\tepq_guest_resume\t$resume\n");
    ghcheck(ghhttp('index.php',null,$revoked)[0]===302,'Old guest recovery cookie revoked');
    ghlogout($guest);[, $login]=ghhttp('login.php',null,$guest);$again=ghconfig($login);ghcache($guest);
    ghcheck(ghlogin($again,ghtoken($again,$guestSub,$guestMail),$guest)[0]===200,'Upgraded guest returns by Google');
    ghcheck(ghhttp('api/player.php',null,$guest)[1]['player']['playerId']===$guestId,'Upgraded guest same persistent player');

    $password=$newCookie();[, $signup]=ghhttp('register.php',null,$password);$username='google_http_'.substr($suffix,0,10);
    ghhttp('register.php',['csrf_token'=>ghcsrf($signup),'username'=>$username,'password'=>'Fixture-Passw0rd!','confirm_password'=>'Fixture-Passw0rd!'],$password);
    [, $setup]=ghhttp('character_setup.php',null,$password);
    ghhttp('character_setup.php',['csrf_token'=>ghcsrf($setup),'display_name'=>'Password Fixture','gender'=>'male','appearance'=>'shadow'],$password);
    $passwordId=ghhttp('api/player.php',null,$password)[1]['player']['playerId'];
    [, $page]=ghhttp('account.php',null,$password);$link=ghconfig($page);ghcache($password);
    ghcheck(ghlogin($link,ghtoken($link,'password-'.$suffix,'password-'.$email),$password)[0]===200,'Password account Google binding');
    ghlogout($password);[, $login]=ghhttp('login.php',null,$password);
    ghcheck(ghhttp('login.php',['csrf_token'=>ghcsrf($login),'username'=>$username,'password'=>'Fixture-Passw0rd!'],$password)[0]===302,'Original password still signs in');
    ghcheck(ghhttp('api/player.php',null,$password)[1]['player']['playerId']===$passwordId,'Password preserves same bound character');
    echo "PASS: actual HTTP signed fixtures, multi-tab/CSRF/signature/claim checks, first/returning Google, scoped recovery, collisions, guest upgrade, saved map/shop/XP and password retention\n";
}finally{foreach($cookies as $cookie)if(is_file($cookie))unlink($cookie);}
