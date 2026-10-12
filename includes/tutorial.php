<?php
declare(strict_types=1);

// Guide progress has no authority over combat rewards or chapter balances.
function epq_safe_tutorial_state(mixed $input): ?array {
    $stages = ['MOVE','MEET','SLIME','BATTLE','RETURN','DONE','SKIPPED','LEGACY'];
    if (!is_array($input) || ($input['version'] ?? null) !== 1
        || !in_array($input['stage'] ?? null, $stages, true)) return null;
    $start = $input['moveStartX'] ?? 440;
    $start = is_numeric($start) && is_finite((float)$start) ? max(70, min(1710, (float)$start)) : 440;
    return ['version'=>1, 'stage'=>$input['stage'], 'moveStartX'=>$start];
}
