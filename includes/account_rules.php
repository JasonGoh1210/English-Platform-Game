<?php
declare(strict_types=1);

function epq_form_text(array $body,string $key): string {
    return is_string($body[$key]??null)?$body[$key]:'';
}

function epq_username_error(string $username): string {
    if($username==='')return '请输入用户名。';
    return preg_match('/\A[a-zA-Z0-9_.-]{3,30}\z/D',$username)===1?'':'用户名需为3–30位，只能包含英文字母、数字、点、横线或下划线。';
}

function epq_new_password_error(string $password): string {
    if($password==='')return '请输入密码。';
    if(str_contains($password,"\0")||preg_match('//u',$password)!==1)return '密码包含无法使用的字符，请重新输入。';
    if(strlen($password)>72)return '密码太长，请减少字符；英文和数字最多72位。';
    if(preg_match_all('/./us',$password)<8)return '密码至少需要8个字符。';
    if(preg_match('/[A-Z]/',$password)!==1)return '密码至少需要1个大写英文字母（A–Z）。';
    if(preg_match('/[0-9]/',$password)!==1)return '密码至少需要1个数字（0–9）。';
    return '';
}

function epq_account_conflict(mysqli $db,string $username,string $email,?int $excludeUserId=null): ?array {
    $excludeUserId=$excludeUserId??0;
    $stmt=$db->prepare('SELECT user_id FROM users WHERE username=? AND user_id<>? LIMIT 1');
    $stmt->bind_param('si',$username,$excludeUserId);$stmt->execute();
    if($stmt->get_result()->fetch_assoc())return ['field'=>'username','message'=>'这个用户名已被使用，请换一个（不区分英文字母大小写）。'];
    if($email!==''){
        $stmt=$db->prepare('SELECT user_id FROM users WHERE email=? AND user_id<>? LIMIT 1');
        $stmt->bind_param('si',$email,$excludeUserId);$stmt->execute();
        if($stmt->get_result()->fetch_assoc())return ['field'=>'email','message'=>'这个电子邮件已经注册过，请使用原账号登录或更换邮箱。'];
    }
    return null;
}
