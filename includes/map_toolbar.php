<?php
// Code-native pixel glyphs stay sharp and inherit the existing bilingual labels.
$mapTools = [
    ['skills', 'skills.open', '技能树', '/FYP/skills.php', 'pixel-skills-link', '<path fill="#a9d9e5" d="M3 4h7v2h4V4h7v16h-7v2h-4v-2H3z"/><path fill="#416779" d="M5 6h4v12H5zm10 0h4v12h-4z"/><path fill="#edcf85" d="M11 7h2v12h-2zM6 8h2v2H6zm10 0h2v2h-2z"/>'],
    ['backpack', 'backpack.open', '背包', '/FYP/backpack.php', 'pixel-backpack-link', '<path fill="#ead09a" d="M8 2h8v2h2v3h2v14H4V7h2V4h2z"/><path fill="#263e4b" d="M9 4h6v3H9z"/><path fill="#ad744e" d="M6 9h12v10H6z"/><path fill="#f4d484" d="M6 12h12v2H6zM11 11h2v5h-2z"/>'],
    ['companion', 'companion.lead', '随从带路', null, '', '<path fill="#d6b581" d="M3 3h4v2h10V3h4v15h-2v3H5v-3H3z"/><path fill="#f4e3ad" d="M5 7h6v7H5zm8 0h6v7h-6z"/><path fill="#213c4b" d="M7 9h2v3H7zm8 0h2v3h-2z"/><path fill="#e6ab5b" d="M10 14h4v2h-1v2h-2v-2h-1z"/>'],
    ['quests', 'guide.open', '任务与洞穴', null, '', '<path fill="#b48b54" d="M3 2h15v2h3v5h-3v10h-3v3H3v-2H1v-4h4V6H3z"/><path fill="#efdbab" d="M5 4h12v13h-2v3H5z"/><path fill="#5e664e" d="M8 7h6v2H8zm0 4h6v2H8zm0 4h4v2H8z"/>'],
    ['settings', 'settings.button', '设置', null, '', '<path fill="#c4d6d8" d="M9 2h6v4h3V4h3v5h-3v6h3v5h-3v-2h-3v4H9v-4H6v2H3v-5h3V9H3V4h3v2h3z"/><path fill="#243b48" d="M9 8h6v2h2v4h-2v2H9v-2H7v-4h2z"/><path fill="#edcb80" d="M10 10h4v4h-4z"/>']
];
?>
<div class="map-toolbar">
  <div class="location-pill pixel-location" id="locationText">MAPLE TOWN</div>
  <div class="map-tool-icons" role="group" aria-label="冒险菜单" data-i18n-aria-label="toolbar.menu">
  <?php foreach ($mapTools as [$tool,$key,$label,$href,$class,$glyph]):
      $id = ['companion'=>'companionLead','quests'=>'questGuideOpen','settings'=>'settingsOpenButton'][$tool] ?? 'mapTool'.ucfirst($tool);
      $tag = $href ? 'a' : 'button'; ?>
    <<?= $tag ?> class="settings-open-button map-icon <?= $class ?>" id="<?= $id ?>" <?= $href ? 'href="'.$href.'"' : 'type="button"' ?> aria-labelledby="<?= $id ?>Label" <?= $tool==='companion'?'aria-pressed="false"':($tool==='quests'?'aria-controls="questGuideScreen" aria-expanded="false"':'') ?>>
      <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true" focusable="false" shape-rendering="crispEdges"><?= $glyph ?></svg>
      <span class="toolbar-label" id="<?= $id ?>Label" data-i18n="<?= $key ?>"><?= $label ?></span>
    </<?= $tag ?>>
  <?php endforeach; ?>
  </div>
</div>
