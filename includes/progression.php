<?php
declare(strict_types=1);
function epq_level_progress(mysqli $db,int $level,int $xp): array {
    $stmt=$db->prepare('SELECT level_no,required_xp_total FROM levels ORDER BY level_no');
    $stmt->execute();$rows=$stmt->get_result();$start=0;$next=null;
    while ($row=$rows->fetch_assoc()) {
        if ((int)$row['level_no']<=$level) $start=(int)$row['required_xp_total'];
        else { $next=(int)$row['required_xp_total'];break; }
    }
    return epq_progress_values($xp,$start,$next);
}
function epq_progress_values(int $xp,int $start,?int $next): array {
    $required=$next===null?0:max(1,$next-$start);
    $earned=max(0,$xp-$start);
    return ['startXp'=>$start,'nextXp'=>$next,'currentXp'=>$earned,'requiredXp'=>$required,
        'percent'=>$next===null?100:min(100,round(100*$earned/$required,2)),'maxLevel'=>$next===null];
}
