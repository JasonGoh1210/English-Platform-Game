<?php
declare(strict_types=1);
require_once __DIR__.'/../includes/account_rules.php';
function archeck(bool $ok,string $message):void{if(!$ok)throw new RuntimeException($message);}
foreach(['Hero_01','abc','A.B-C',str_repeat('a',30)] as $name)archeck(epq_username_error($name)==='','Valid username');
foreach(['','ab',str_repeat('a',31),'a b','名字123',"abc\n",'<script>'] as $name)archeck(epq_username_error($name)!=='','Invalid username');
foreach(['ABCDEF12','Password1','1ABCDEF2',str_repeat('A',71).'1','  Abc12 ',str_repeat('界',6).'A1'] as $password)archeck(epq_new_password_error($password)==='','Required uppercase, number and eight actual characters');
foreach(['','Abc1234','abcdefgh','abcdef12','ABCDEFGH','12345678',str_repeat('A',72).'1','界界A1',"Abc1234\0","Abc1234\xff"] as $password)archeck(epq_new_password_error($password)!=='','Weak, too long, invalid or short Unicode password');
archeck(epq_form_text(['password'=>['array']],'password')===''&&epq_form_text(['username'=>123],'username')==='','Form arrays and numeric coercions rejected');
echo "PASS: account name limits, uppercase and digit policy, exact Unicode length, bcrypt byte boundary and typed input\n";
