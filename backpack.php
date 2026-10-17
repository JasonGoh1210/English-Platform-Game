<?php
declare(strict_types=1);
require_once __DIR__.'/includes/auth.php';
require_once __DIR__.'/includes/shop.php';
epq_require_login_page();
?>
<!DOCTYPE html>
<html lang="zh-CN"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,">
  <title>冒险背包 · English Power Quest</title>
  <link rel="stylesheet" href="/FYP/css/learning.css?v=20261017-castleroad2">
  <link rel="stylesheet" href="/FYP/css/shop.css?v=20261017-castleroad2">
  <link rel="stylesheet" href="/FYP/css/backpack.css?v=20261017-castleroad2">
<?php $epqLoadingMode = 'backpack'; require __DIR__.'/includes/loading_screen.php'; ?>
</head><body class="learning-page shop-page backpack-page">
<main class="learning-shell">
  <header class="learning-header"><div><p class="learning-kicker">ENGLISH POWER QUEST</p><h1 data-i18n="backpack.title">冒险背包</h1><p data-i18n="backpack.subtitle">查看随身补给，选择陪你冒险的伙伴。</p></div>
    <div class="learning-navigation"><div class="learning-languages"><button data-set-language="en">English</button><button data-set-language="zh">简体中文</button></div><a class="learning-button" href="/FYP/index.php" data-i18n="destination.back">返回地图</a></div>
  </header>
  <section class="shop-balances"><div><span data-i18n="shop.coins">金币</span><b id="shopCoins">—</b></div><div><span data-i18n="shop.stock">药水背包</span><b id="shopPotions">—</b></div><div><span data-i18n="shop.equipped">当前随从</span><b id="shopCompanion">—</b></div></section>
  <p id="shopStatus" role="status" aria-live="polite"></p><button class="learning-button hidden" id="shopRetry" data-i18n="review.retry">重试</button>
  <div class="backpack-summary-items">
    <section><h2 data-i18n="castle.questItems">任务物品</h2><div class="shop-grid"><article class="shop-card"><svg width="64" height="64" viewBox="0 0 24 24" aria-hidden="true" shape-rendering="crispEdges"><path fill="#edcc7b" d="M3 2h8v2h2v6h-2v2H9v3h3v3H9v3H5V12H3v-2H1V4h2z"/><path fill="#203848" d="M5 5h4v4H5z"/></svg><h3 data-i18n="castle.key">城门钥匙</h3><p id="backpackCastleKey">—</p></article></div></section>
    <section><h2 data-i18n="backpack.supplies">我的药水</h2><div class="shop-grid" id="shopSupplies"></div></section>
  </div>
  <h2 data-i18n="backpack.companions">我的随从</h2><p class="learning-note" data-i18n="backpack.shopHint">更多药水和随从皮肤，可到枫叶镇的商店购买。</p>
  <section class="shop-grid" id="shopSkins"></section>
</main>
<script>window.EPQ_SHOP=<?= json_encode(['mode'=>'backpack','playerId'=>(int)$_SESSION['player_id'],'csrfToken'=>$_SESSION['csrf_token'],'catalog'=>epq_shop_catalog()],JSON_HEX_TAG|JSON_HEX_APOS|JSON_HEX_AMP|JSON_HEX_QUOT) ?>;</script>
<script type="module" src="/FYP/js/shop.js?v=20261017-castleroad2"></script>
</body></html>
