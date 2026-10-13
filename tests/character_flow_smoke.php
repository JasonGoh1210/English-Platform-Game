<?php
declare(strict_types=1);
if(getenv('EPQ_BATTLE_TEST_DB')!=='isolated')throw new RuntimeException('Isolated database acknowledgement required.');
require_once __DIR__.'/../includes/auth.php';
require_once __DIR__.'/../includes/google.php';
function ccheck(bool $ok,string $label):void {if(!$ok)throw new RuntimeException($label);}
function chhttp(string $path,?array $body,string $cookie):array {
    $curl=curl_init('http://127.0.0.1:8081/FYP/'.$path);
    curl_setopt_array($curl,[CURLOPT_RETURNTRANSFER=>true,CURLOPT_COOKIEFILE=>$cookie,CURLOPT_COOKIEJAR=>$cookie,CURLOPT_TIMEOUT=>15]);
    if($body!==null){curl_setopt($curl,CURLOPT_POST,true);if(str_starts_with($path,'api/')){
        curl_setopt($curl,CURLOPT_HTTPHEADER,['Content-Type: application/json']);curl_setopt($curl,CURLOPT_POSTFIELDS,json_encode($body));
    }else curl_setopt($curl,CURLOPT_POSTFIELDS,http_build_query($body));}
    $text=curl_exec($curl);$status=(int)curl_getinfo($curl,CURLINFO_RESPONSE_CODE);curl_close($curl);
    ccheck($text!==false,'Test HTTP response');return [$status,str_starts_with($path,'api/')?json_decode($text,true):$text];
}
function chcsrf(string $page):string {preg_match('/name="csrf_token" value="([a-f0-9]{64})"/',$page,$m);ccheck(isset($m[1]),'CSRF form');return $m[1];}
$db=epq_db();mysqli_report(MYSQLI_REPORT_ERROR|MYSQLI_REPORT_STRICT);
$cookie=tempnam(sys_get_temp_dir(),'epq_character_');[, $login]=chhttp('login.php',null,$cookie);
ccheck(!str_contains($login,'name="guest_name"')&&str_contains($login,'使用 Google 登录'),'Login defers name and shows Google');
chhttp('login.php',['guest_mode'=>'1','csrf_token'=>chcsrf($login)],$cookie);
ccheck(chhttp('api/player.php',null,$cookie)[0]===409,'Unfinished character cannot use game APIs');
[, $setup]=chhttp('character_setup.php',null,$cookie);$csrf=chcsrf($setup);
ccheck(str_contains($setup,'id="randomName"'),'Dice appears after authentication');
ccheck(chhttp('character_setup.php',['csrf_token'=>'wrong','display_name'=>'Fixture','appearance'=>'forest','gender'=>'female'],$cookie)[0]===403,'Setup CSRF');
ccheck(chhttp('character_setup.php',['csrf_token'=>$csrf,'display_name'=>'<script>','appearance'=>'forest','gender'=>'female'],$cookie)[0]===400,'Name validation');
ccheck(chhttp('character_setup.php',['csrf_token'=>$csrf,'display_name'=>'Fixture','appearance'=>'admin','gender'=>'female'],$cookie)[0]===400,'Appearance allowlist');
ccheck(chhttp('character_setup.php',['csrf_token'=>$csrf,'display_name'=>'Fixture','appearance'=>'forest','gender'=>'invalid'],$cookie)[0]===400,'Gender allowlist');
ccheck(chhttp('character_setup.php',['csrf_token'=>$csrf,'display_name'=>'星澜','appearance'=>'forest','gender'=>'female','player_id'=>999999],$cookie)[0]===302,'Character setup ignores client player ID');
[, $player]=chhttp('api/player.php',null,$cookie);$p=$player['player'];$playerId=(int)$p['playerId'];
ccheck($p['displayName']==='星澜'&&$p['character']['appearance']==='forest'&&$p['character']['gender']==='female'&&$p['xp']===0&&$p['coins']===0,'Chosen profile persists without free balances');
$userId=(int)$db->query('SELECT user_id FROM players WHERE player_id='.$playerId)->fetch_assoc()['user_id'];
epq_complete_character($db,$userId,$playerId,'Overwrite','arcane','male');
ccheck($db->query('SELECT display_name FROM players WHERE player_id='.$playerId)->fetch_assoc()['display_name']==='星澜','Setup replay keeps name');
[, $page]=chhttp('index.php',null,$cookie);$csrf=chcsrf($page);
ccheck(chhttp('api/google_login.php',['credential'=>'fake','csrfToken'=>'wrong'],$cookie)[0]===403,'Google CSRF');
if(epq_google_client_id()==='')ccheck(chhttp('api/google_login.php',['credential'=>'fake','csrfToken'=>$csrf],$cookie)[0]===503,'Unconfigured Google cannot fake success');
// Database identity decisions use trusted fixture identities, separately covered by RSA tests.
$subject='fixture-'.bin2hex(random_bytes(12));$identity=['sub'=>$subject,'email'=>$subject.'@example.com','email_verified'=>true];
$new=epq_google_identity_account($db,$identity,null);ccheck(!epq_character_profile($db,(int)$new['player_id'])['complete'],'First Google login creates pending character');
$repeat=epq_google_identity_account($db,$identity,null);ccheck($new['player_id']===$repeat['player_id'],'Returning Google identity keeps player');
$db->query('UPDATE players SET xp_total=55,coins_total=17 WHERE player_id='.$playerId);
$linked=epq_google_identity_account($db,['sub'=>'linked-'.$subject,'email'=>'linked-'.$subject.'@example.com','email_verified'=>true],['user_id'=>$userId,'player_id'=>$playerId]);
ccheck((int)$linked['player_id']===$playerId&&$linked['display_name']==='星澜','Guest Google upgrade preserves same character');
ccheck($db->query('SELECT COUNT(*) AS n FROM guest_login_tokens WHERE user_id='.$userId)->fetch_assoc()['n']==0,'Upgrade revokes only guest login tokens');
$balance=$db->query('SELECT xp_total,coins_total FROM players WHERE player_id='.$playerId)->fetch_assoc();ccheck((int)$balance['xp_total']===55&&(int)$balance['coins_total']===17,'Link preserves balances');
ccheck(epq_character_profile($db,$playerId)['gender']==='female','Link preserves appearance and gender');
$blocked=false;try{epq_google_identity_account($db,$identity,['user_id'=>$userId,'player_id'=>$playerId]);}catch(DomainException $e){$blocked=true;}ccheck($blocked,'No automatic merge into another Google player');
$blocked=false;try{epq_google_identity_account($db,['sub'=>'other-'.$subject,'email'=>$identity['email'],'email_verified'=>true],null);}catch(DomainException $e){$blocked=true;}ccheck($blocked,'Email collision never silently links accounts');
// A normal password registration also defers character naming.
$newCookie=tempnam(sys_get_temp_dir(),'epq_register_');[, $form]=chhttp('register.php',null,$newCookie);
ccheck(!str_contains($form,'name="display_name"'),'Registration has no character-name field');
$username='profile_'.bin2hex(random_bytes(5));
ccheck(chhttp('register.php',['csrf_token'=>chcsrf($form),'username'=>$username,'password'=>'Profile-Passw0rd!','confirm_password'=>'Profile-Passw0rd!'],$newCookie)[0]===302,'Account registration without character name');
ccheck(chhttp('api/player.php',null,$newCookie)[0]===409,'Password signup awaits character setup');
[, $form]=chhttp('character_setup.php',null,$newCookie);
chhttp('character_setup.php',['csrf_token'=>chcsrf($form),'display_name'=>'Mira Dawn','appearance'=>'arcane','gender'=>'female'],$newCookie);
[, $created]=chhttp('api/player.php',null,$newCookie);$createdId=(int)$created['player']['playerId'];
[, $map]=chhttp('index.php',null,$newCookie);chhttp('logout.php',['csrf_token'=>chcsrf($map)],$newCookie);
[, $form]=chhttp('login.php',null,$newCookie);
chhttp('login.php',['csrf_token'=>chcsrf($form),'username'=>$username,'password'=>'Profile-Passw0rd!'],$newCookie);
[, $returning]=chhttp('api/player.php',null,$newCookie);
ccheck($returning['player']['playerId']===$createdId&&$returning['player']['character']['appearance']==='arcane','Returning password account keeps selected character');
ccheck(chhttp('character_setup.php',null,$newCookie)[0]===302,'Completed character bypasses setup');
$blocked=false;try{epq_complete_character($db,$userId,(int)$new['player_id'],'Intruder','forest','male');}catch(DomainException $e){$blocked=true;}
ccheck($blocked&&!epq_character_profile($db,(int)$new['player_id'])['complete'],'Another owner cannot complete pending character');
// Pre-migration accounts have no profile row and retain their existing name and balances.
$legacyName='legacy_'.bin2hex(random_bytes(5));$hash=password_hash('Legacy-Passw0rd!',PASSWORD_DEFAULT);
$stmt=$db->prepare("INSERT INTO users(username,password_hash,account_type) VALUES (?,?,'password')");$stmt->bind_param('ss',$legacyName,$hash);$stmt->execute();$legacyUser=(int)$db->insert_id;
$world=(int)$db->query('SELECT world_id FROM worlds WHERE world_order=1')->fetch_assoc()['world_id'];
$stmt=$db->prepare("INSERT INTO players(user_id,display_name,current_world_id,story_intro_seen,xp_total,coins_total) VALUES (?,'Existing Hero',?,1,31,9)");$stmt->bind_param('ii',$legacyUser,$world);$stmt->execute();$legacyPlayer=(int)$db->insert_id;
$oldCookie=tempnam(sys_get_temp_dir(),'epq_legacy_');[, $form]=chhttp('login.php',null,$oldCookie);
chhttp('login.php',['csrf_token'=>chcsrf($form),'username'=>$legacyName,'password'=>'Legacy-Passw0rd!'],$oldCookie);
[, $old]=chhttp('api/player.php',null,$oldCookie);
ccheck($old['player']['playerId']===$legacyPlayer&&$old['player']['displayName']==='Existing Hero'&&$old['player']['xp']===31&&$old['player']['coins']===9&&$old['player']['character']['complete'],'Old account bypasses creation and retains data');
$passwordBefore=$db->query('SELECT password_hash FROM users WHERE user_id='.$legacyUser)->fetch_assoc()['password_hash'];
epq_google_identity_account($db,['sub'=>'password-'.$subject,'email'=>'password-'.$subject.'@example.com'],['user_id'=>$legacyUser,'player_id'=>$legacyPlayer]);
$passwordAfter=$db->query('SELECT password_hash,account_type FROM users WHERE user_id='.$legacyUser)->fetch_assoc();
ccheck($passwordBefore===$passwordAfter['password_hash']&&$passwordAfter['account_type']==='password','Google binding retains password login');
foreach([$cookie,$newCookie,$oldCookie] as $fixtureCookie)unlink($fixtureCookie);
echo "PASS: first-login setup, dice, name/appearance/gender, owner/CSRF, replay, deferred signup, Google account reuse/link/collision and preserved balances\n";
