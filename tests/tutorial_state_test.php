<?php
declare(strict_types=1);
require_once __DIR__.'/../includes/tutorial.php';
foreach (['MOVE','MEET','SLIME','BATTLE','RETURN','DONE','SKIPPED','LEGACY'] as $stage) {
    $safe = epq_safe_tutorial_state(['version'=>1,'stage'=>$stage,'moveStartX'=>440,'xpDelta'=>99999]);
    if ($safe !== ['version'=>1,'stage'=>$stage,'moveStartX'=>440.0]) throw new RuntimeException('Valid stage or secret filtering: '.$stage);
}
foreach ([null, false, 'MOVE', [], ['version'=>2,'stage'=>'MOVE'], ['version'=>1,'stage'=>'GRANT_XP']] as $invalid) {
    if (epq_safe_tutorial_state($invalid) !== null) throw new RuntimeException('Invalid tutorial accepted.');
}
if (epq_safe_tutorial_state(['version'=>1,'stage'=>'MOVE','moveStartX'=>99999])['moveStartX'] !== 1710) throw new RuntimeException('Position bounds.');
echo "PASS: tutorial stages, bounded movement anchor and no reward fields\n";
