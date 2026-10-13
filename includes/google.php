<?php
declare(strict_types=1);
require_once __DIR__.'/../config/google.php';

function epq_google_request(string $mode): array {
    if (!in_array($mode,['login','link'],true)) throw new DomainException('Invalid Google sign-in mode.');
    $owner = (int)($_SESSION['user_id'] ?? 0);
    if (($mode==='link') !== ($owner>0)) throw new DomainException('请刷新页面后重试。');
    $request = ['nonce'=>bin2hex(random_bytes(32)), 'created'=>time(), 'mode'=>$mode,
        'user_id'=>$owner, 'player_id'=>(int)($_SESSION['player_id'] ?? 0)];
    $_SESSION['google_request'] = $request;
    return $request;
}

function epq_google_decode(string $part): string {
    if ($part==='' || preg_match('/^[a-zA-Z0-9_-]+$/D',$part)!==1) throw new DomainException('Google 登录凭证无效。');
    $raw = base64_decode(strtr($part,'-_','+/').str_repeat('=',(4-strlen($part)%4)%4),true);
    if ($raw===false) throw new DomainException('Google 登录凭证无效。');
    return $raw;
}

function epq_verify_google_token(string $token, array $certificates, string $clientId, string $nonce, ?int $now=null): array {
    if (strlen($token)>16384 || substr_count($token,'.')!==2 || $clientId==='' || $nonce==='') throw new DomainException('Google 登录凭证无效。');
    [$head,$body,$sig] = explode('.',$token);
    try { $header=json_decode(epq_google_decode($head),true,16,JSON_THROW_ON_ERROR);
        $claims=json_decode(epq_google_decode($body),true,16,JSON_THROW_ON_ERROR); }
    catch (Throwable $e) { throw new DomainException('Google 登录凭证无效。'); }
    if (!is_array($header) || !is_array($claims) || ($header['alg']??null)!=='RS256'
        || !is_string($header['kid']??null) || !isset($certificates[$header['kid']])) throw new DomainException('Google 签名无效。');
    $certificate=$certificates[$header['kid']];
    if (!is_string($certificate) || openssl_verify($head.'.'.$body,epq_google_decode($sig),$certificate,OPENSSL_ALGO_SHA256)!==1) {
        throw new DomainException('Google 签名无效。');
    }
    $now=$now??time();
    if (!in_array($claims['iss']??null,['accounts.google.com','https://accounts.google.com'],true)
        || ($claims['aud']??null)!==$clientId || (isset($claims['azp']) && $claims['azp']!==$clientId)
        || !is_int($claims['exp']??null) || $claims['exp']<=$now
        || !is_int($claims['iat']??null) || $claims['iat']>$now+60
        || !is_string($claims['nonce']??null) || !hash_equals($nonce,$claims['nonce'])
        || !is_string($claims['sub']??null) || $claims['sub']==='' || strlen($claims['sub'])>255) {
        throw new DomainException('Google 登录已过期或不属于当前页面，请刷新后重试。');
    }
    if (isset($claims['email']) && (!is_string($claims['email']) || !filter_var($claims['email'],FILTER_VALIDATE_EMAIL)
        || ($claims['email_verified']??null)!==true)) throw new DomainException('Google 邮箱尚未验证。');
    return $claims;
}

function epq_google_certificates(): array {
    // Fixed Google PEM endpoint; never use a token-supplied jku/x5u URL.
    $curl=curl_init('https://www.googleapis.com/oauth2/v1/certs');
    $body='';
    curl_setopt_array($curl,[CURLOPT_CONNECTTIMEOUT=>5,CURLOPT_TIMEOUT=>15,CURLOPT_FOLLOWLOCATION=>false,
        CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,
        CURLOPT_WRITEFUNCTION=>static function($handle,string $chunk) use (&$body):int {
            if (strlen($body)+strlen($chunk)>262144) return 0;
            $body.=$chunk;return strlen($chunk);
        }]);
    $ok=curl_exec($curl);$status=(int)curl_getinfo($curl,CURLINFO_RESPONSE_CODE);curl_close($curl);
    if ($ok===false || $status!==200) throw new RuntimeException('无法连接 Google 验证服务，请稍后重试。');
    $certificates=json_decode($body,true);
    if (!is_array($certificates) || !$certificates) throw new RuntimeException('Google 验证服务暂时不可用。');
    return $certificates;
}

function epq_google_identity_account(mysqli $db, array $identity, ?array $owner): array {
    $subject=(string)$identity['sub'];
    $email=isset($identity['email']) && strlen((string)$identity['email'])<=120 ? strtolower((string)$identity['email']) : null;
    mysqli_report(MYSQLI_REPORT_ERROR|MYSQLI_REPORT_STRICT);
    $db->begin_transaction();
    try {
        $find=$db->prepare('SELECT u.user_id,u.username,u.account_type,p.player_id,p.display_name,p.story_intro_seen
            FROM users u INNER JOIN players p ON p.user_id=u.user_id WHERE u.google_sub=? FOR UPDATE');
        $find->bind_param('s',$subject);$find->execute();$existing=$find->get_result()->fetch_assoc();
        if ($existing) {
            if ($owner && ((int)$existing['user_id']!==(int)$owner['user_id'] || (int)$existing['player_id']!==(int)$owner['player_id'])) {
                throw new DomainException('这个 Google 账号已有其他角色，无法自动合并。当前存档仍然保留。');
            }
            $db->commit();return $existing;
        }
        if ($email!==null) {
            $duplicate=$db->prepare('SELECT user_id FROM users WHERE email=? FOR UPDATE');
            $duplicate->bind_param('s',$email);$duplicate->execute();$emailOwner=$duplicate->get_result()->fetch_assoc();
            if ($emailOwner && (!$owner || (int)$emailOwner['user_id']!==(int)$owner['user_id'])) {
                throw new DomainException('此邮箱已有账号。请先用原账号密码登录，再从账号设置绑定 Google；当前角色不会自动合并。');
            }
        }
        if ($owner) {
            $userId=(int)$owner['user_id'];$playerId=(int)$owner['player_id'];
            $lock=$db->prepare('SELECT u.username,u.account_type,u.google_sub,u.email,p.display_name,p.story_intro_seen
                FROM users u INNER JOIN players p ON p.user_id=u.user_id WHERE u.user_id=? AND p.player_id=? FOR UPDATE');
            $lock->bind_param('ii',$userId,$playerId);$lock->execute();$row=$lock->get_result()->fetch_assoc();
            if (!$row || $row['google_sub']!==null) throw new DomainException('当前账号无法绑定这个 Google 账号。');
            $type=$row['account_type']==='guest'?'google':$row['account_type'];
            $storedEmail=$row['email']??$email;
            $username=$row['account_type']==='guest'?'google_'.bin2hex(random_bytes(12)):$row['username'];
            $link=$db->prepare('UPDATE users SET google_sub=?,account_type=?,email=?,username=? WHERE user_id=?');
            $link->bind_param('ssssi',$subject,$type,$storedEmail,$username,$userId);$link->execute();
            if ($row['account_type']==='guest') epq_guest_revoke_tokens($db,$userId);
            $result=['user_id'=>$userId,'player_id'=>$playerId,'username'=>$username,'display_name'=>$row['display_name'],
                'story_intro_seen'=>$row['story_intro_seen'],'account_type'=>$type];
        } else {
            $username='google_'.bin2hex(random_bytes(12));
            $insert=$db->prepare("INSERT INTO users (username,email,google_sub,account_type) VALUES (?,?,?,'google')");
            $insert->bind_param('sss',$username,$email,$subject);$insert->execute();$userId=(int)$db->insert_id;
            $playerId=epq_new_player($db,$userId);
            $result=['user_id'=>$userId,'player_id'=>$playerId,'username'=>$username,'display_name'=>'Adventurer',
                'story_intro_seen'=>0,'account_type'=>'google'];
        }
        $db->commit();return $result;
    } catch (Throwable $e) { $db->rollback();throw $e; }
}
