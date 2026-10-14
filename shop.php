<?php
declare(strict_types=1);
require_once __DIR__.'/includes/auth.php';
require_once __DIR__.'/includes/shop.php';
epq_require_login_page();
?>
<!DOCTYPE html>
<html lang="zh-CN"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,">
  <title>旅人商店 · English Power Quest</title>
  <link rel="stylesheet" href="/FYP/css/learning.css?v=20261015-village2">
  <link rel="stylesheet" href="/FYP/css/shop.css?v=20261015-village2">
</head><body class="learning-page shop-page">
<main class="learning-shell">
  <header class="learning-header"><div><p class="learning-kicker">ENGLISH POWER QUEST</p><h1 data-i18n="shop.title">旅人商店</h1><p data-i18n="shop.subtitle">准备药水，带上你的像素伙伴。</p></div>
    <div class="learning-navigation"><div class="learning-languages"><button data-set-language="en">English</button><button data-set-language="zh">简体中文</button></div><a class="learning-button" href="/FYP/index.php" data-i18n="destination.back">返回地图</a></div>
  </header>
  <section class="shop-balances"><div><span data-i18n="shop.coins">金币</span><b id="shopCoins">—</b></div><div><span data-i18n="shop.stock">药水背包</span><b id="shopPotions">—</b></div><div><span data-i18n="shop.equipped">当前随从</span><b id="shopCompanion">—</b></div></section>
  <p id="shopStatus" role="status" aria-live="polite"></p><button class="learning-button hidden" id="shopRetry" data-i18n="review.retry">重试</button>
  <h2 data-i18n="shop.supplies">冒险补给</h2><section class="shop-grid" id="shopSupplies" aria-label="Potions"></section>
  <h2 data-i18n="shop.skins">六种随从外观</h2><p class="learning-note" data-i18n="shop.guideHelp">所有随从都会跟随你并指引任务。外观不会改变战斗能力；猫头鹰免费陪伴。</p>
  <section class="shop-grid" id="shopSkins" aria-label="Companion appearances"></section>
  <dialog id="shopConfirm" aria-labelledby="shopConfirmTitle"><h2 id="shopConfirmTitle" data-i18n="shop.confirmTitle">购买这件商品？</h2><p id="shopConfirmText"></p><div class="shop-actions"><button id="shopCancel" data-i18n="skills.cancel">返回</button><button id="shopBuy" data-i18n="shop.confirm">确认购买</button></div></dialog>
</main>
<script>window.EPQ_SHOP=<?= json_encode(['playerId'=>(int)$_SESSION['player_id'],'csrfToken'=>$_SESSION['csrf_token'],'catalog'=>epq_shop_catalog()],JSON_HEX_TAG|JSON_HEX_APOS|JSON_HEX_AMP|JSON_HEX_QUOT) ?>;</script>
<script type="module" src="/FYP/js/shop.js?v=20261015-village2"></script>
</body></html>
