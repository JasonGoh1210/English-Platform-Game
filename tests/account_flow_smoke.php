<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
if(getenv('EPQ_BATTLE_TEST_DB')!=='isolated')throw new RuntimeException('Isolated database acknowledgement required.');
require_once __DIR__.'/../config/db.php';
require_once __DIR__.'/../includes/characters.php';
function afcheck(bool $ok,string $label):void{if(!$ok)throw new RuntimeException($label);}
function afhttp(string $path,?array $body,string $cookie):array{
    $curl=curl_init('http://127.0.0.1:8081/FYP/'.$path);
    curl_setopt_array($curl,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_COOKIEFILE=>$cookie,CURLOPT_COOKIEJAR=>$cookie,CURLOPT_TIMEOUT=>15]);
    if($body!==null){curl_setopt($curl,CURLOPT_POST,true);if(str_starts_with($path,'api/')){
        curl_setopt($curl,CURLOPT_HTTPHEADER,['Content-Type: application/json']);curl_setopt($curl,CURLOPT_POSTFIELDS,json_encode($body));
    }else curl_setopt($curl,CURLOPT_POSTFIELDS,http_build_query($body));}
    $text=curl_exec($curl);$code=(int)curl_getinfo($curl,CURLINFO_RESPONSE_CODE);curl_close($curl);
    afcheck(is_string($text)&&!str_contains($text,'<b>Warning</b>'),'HTTP response without PHP warnings');
    return [$code,str_starts_with($path,'api/')?json_decode($text,true):$text];
}
function afcsrf(string $page):string{preg_match('/name="csrf_token" value="([a-f0-9]{64})"/',$page,$m);afcheck(isset($m[1]),'CSRF token');return $m[1];}
$db=epq_db();mysqli_report(MYSQLI_REPORT_ERROR|MYSQLI_REPORT_STRICT);$cookies=[];
$newCookie=static function()use(&$cookies):string{$cookie=tempnam(sys_get_temp_dir(),'epq_account_');$cookies[]=$cookie;return $cookie;};
$suffix=bin2hex(random_bytes(5));$name='account_'.$suffix;$email=$name.'@example.com';$password='ABCDEF12';
try{
    $cookie=$newCookie();[, $form]=afhttp('register.php',null,$cookie);$csrf=afcsrf($form);
    $body=['csrf_token'=>$csrf,'username'=>$name,'email'=>$email,'password'=>$password,'confirm_password'=>$password];
    $count=(int)$db->query('SELECT COUNT(*) AS n FROM users')->fetch_assoc()['n'];
    foreach(['abc12345','ABCDEFGH','12345678','Abc1234',str_repeat('A',72).'1'] as $weak){
        afcheck(afhttp('register.php',array_replace($body,['password'=>$weak,'confirm_password'=>$weak]),$cookie)[0]===400,'Bypassed weak password rejected by server');
    }
    foreach(['ab','bad name',str_repeat('a',31)] as $bad)afcheck(afhttp('register.php',array_replace($body,['username'=>$bad]),$cookie)[0]===400,'Server username limits');
    afcheck(afhttp('register.php',array_replace($body,['username'=>['bad'],'password'=>['bad']]),$cookie)[0]===400,'Typed form values');
    afcheck(afhttp('register.php',array_replace($body,['confirm_password'=>'Different1']),$cookie)[0]===400,'Server confirmation');
    afcheck(afhttp('register.php',array_replace($body,['csrf_token'=>'wrong']),$cookie)[0]===403,'Registration CSRF');
    afcheck((int)$db->query('SELECT COUNT(*) AS n FROM users')->fetch_assoc()['n']===$count,'Rejected input cannot create any account');
    afcheck(afhttp('api/check_username.php',null,$cookie)[0]===405,'Availability POST only');
    afcheck(afhttp('api/check_username.php',['csrfToken'=>'wrong','username'=>$name],$cookie)[0]===403,'Availability CSRF');
    afcheck(afhttp('api/check_username.php',['csrfToken'=>$csrf,'username'=>'bad name'],$cookie)[0]===400,'Availability format');
    $available=afhttp('api/check_username.php',['csrfToken'=>$csrf,'username'=>strtoupper($name)],$cookie)[1];
    afcheck($available['available']===true&&$available['username']===$name&&!isset($available['user_id']),'Availability normalizes case without exposing owner');
    afcheck(afhttp('register.php',array_replace($body,['username'=>strtoupper($name)]),$cookie)[0]===302,'Valid uppercase plus numeric password, username normalized');
    [, $setup]=afhttp('character_setup.php',null,$cookie);
    afhttp('character_setup.php',['csrf_token'=>afcsrf($setup),'display_name'=>'Account Hero','gender'=>'female','appearance'=>'forest'],$cookie);
    $player=afhttp('api/player.php',null,$cookie)[1]['player'];$playerId=$player['playerId'];
    $other=$newCookie();[, $form]=afhttp('register.php',null,$other);$otherCsrf=afcsrf($form);
    afcheck(afhttp('api/check_username.php',['csrfToken'=>$otherCsrf,'username'=>strtoupper($name)],$other)[1]['available']===false,'Duplicate usernames ignore case');
    [$code,$duplicate]=afhttp('register.php',array_replace($body,['csrf_token'=>$otherCsrf,'username'=>strtoupper($name)]),$other);
    afcheck($code===409&&str_contains($duplicate,'这个用户名已被使用')&&str_contains($duplicate,'id="usernameError"'),'Duplicate reports specific username error');
    [$code,$duplicateEmail]=afhttp('register.php',array_replace($body,['csrf_token'=>$otherCsrf,'username'=>'other_'.$suffix]),$other);
    afcheck($code===409&&str_contains($duplicateEmail,'这个电子邮件已经注册过'),'Duplicate email reports specific field');
    afcheck((int)$db->query('SELECT COUNT(*) AS n FROM users')->fetch_assoc()['n']===$count+1,'Only one unique account created');

    $guest=$newCookie();[, $form]=afhttp('login.php',null,$guest);afhttp('login.php',['guest_mode'=>'1','csrf_token'=>afcsrf($form)],$guest);
    [, $setup]=afhttp('character_setup.php',null,$guest);afhttp('character_setup.php',['csrf_token'=>afcsrf($setup),'display_name'=>'Upgrade Hero','gender'=>'male','appearance'=>'arcane'],$guest);
    $guestId=(int)afhttp('api/player.php',null,$guest)[1]['player']['playerId'];$db->query('UPDATE players SET xp_total=55,coins_total=50 WHERE player_id='.$guestId);
    [, $map]=afhttp('index.php',null,$guest);$guestCsrf=afcsrf($map);
    afcheck(afhttp('api/shop.php',['csrfToken'=>$guestCsrf,'action'=>'BUY','item'=>'fox','requestId'=>bin2hex(random_bytes(16))],$guest)[0]===200,'Guest owns companion before upgrade');
    afcheck(afhttp('api/game_state.php',['csrfToken'=>$guestCsrf,'state'=>['currentRealmId'=>'maple','playerX'=>720]],$guest)[0]===200,'Guest save before upgrade');
    $saved=afhttp('api/game_state.php',null,$guest)[1]['state'];$stock=afhttp('api/shop.php',null,$guest)[1]['shop'];
    [, $form]=afhttp('register.php',null,$guest);$upgrade=array_replace($body,['csrf_token'=>afcsrf($form),'email'=>'','username'=>'upgraded_'.$suffix]);
    afcheck(afhttp('register.php',array_replace($upgrade,['password'=>'12345678','confirm_password'=>'12345678']),$guest)[0]===400,'Guest weak password rejected');
    [$code,$duplicate]=afhttp('register.php',array_replace($upgrade,['username'=>strtoupper($name)]),$guest);
    afcheck($code===409&&str_contains($duplicate,'这个用户名已被使用'),'Guest duplicate specific feedback');
    afcheck(afhttp('api/player.php',null,$guest)[1]['player']['playerId']===$guestId,'Failed upgrade preserves owner');
    afcheck(afhttp('register.php',$upgrade,$guest)[0]===302,'Valid guest upgrade');
    $after=afhttp('api/player.php',null,$guest)[1]['player'];
    afcheck($after['playerId']===$guestId&&$after['displayName']==='Upgrade Hero'&&$after['xp']===55&&$after['coins']===10,'Upgrade preserves same player and balances');
    afcheck(afhttp('api/game_state.php',null,$guest)[1]['state']===$saved&&afhttp('api/shop.php',null,$guest)[1]['shop']===$stock,'Upgrade preserves map and companion inventory');

    $legacyName='account_legacy_'.$suffix;$hash=password_hash('old7',PASSWORD_DEFAULT);
    $insert=$db->prepare("INSERT INTO users(username,password_hash,account_type) VALUES (?,?,'password')");$insert->bind_param('ss',$legacyName,$hash);$insert->execute();$legacyUser=(int)$db->insert_id;
    $legacyPlayer=epq_new_player($db,$legacyUser);epq_complete_character($db,$legacyUser,$legacyPlayer,'Legacy Hero','shadow','male');
    $legacy=$newCookie();[, $form]=afhttp('login.php',null,$legacy);
    afcheck(afhttp('login.php',['csrf_token'=>afcsrf($form),'username'=>strtoupper($legacyName),'password'=>'old7'],$legacy)[0]===302,'Original short lowercase password still signs in');
    afcheck(afhttp('api/player.php',null,$legacy)[1]['player']['playerId']===$legacyPlayer,'Legacy login resumes same player');
    echo "PASS: registration/availability server validation, case-insensitive unique names, duplicate field errors, CSRF, rejected-input no writes, preserved guest shop/map/balances and legacy weak-password login\n";
}finally{foreach($cookies as $cookie)if(is_file($cookie))unlink($cookie);}
