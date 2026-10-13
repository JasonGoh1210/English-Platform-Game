<?php
declare(strict_types=1);
require_once __DIR__.'/../includes/progression.php';
$p=epq_progress_values(246,100,250);
if($p['currentXp']!==146||$p['requiredXp']!==150||$p['percent']!==97.33)throw new RuntimeException('Level 2 progress');
if(epq_progress_values(100,100,250)['percent']!==0.0)throw new RuntimeException('New level resets bar');
if(epq_progress_values(900,100,250)['percent']!==100)throw new RuntimeException('Bounded bar');
if(!epq_progress_values(2700,2700,null)['maxLevel'])throw new RuntimeException('Maximum level');
echo "PASS: nonlinear XP thresholds, new level, bounded bar and maximum level\n";
