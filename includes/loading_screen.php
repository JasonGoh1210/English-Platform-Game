<?php
// Shared head include. The caller selects the page's real readiness signal.
$epqLoadingMode = $epqLoadingMode ?? 'page';
?>
<link rel="stylesheet" href="/FYP/css/loading.css?v=20261015-loading2">
<script src="/FYP/js/loading.js?v=20261017-castleroad2" data-loading-mode="<?= htmlspecialchars($epqLoadingMode, ENT_QUOTES, 'UTF-8') ?>" defer></script>
