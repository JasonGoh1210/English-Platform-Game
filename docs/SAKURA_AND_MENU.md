# 樱花树、快捷菜单与城堡尺寸

2026-10-17，按最新截图反馈实现。

- 五个顶部图标打开菜单时不显示全屏 loading。技能、背包和学习记录直接展示页面，数据读取与失败重试沿用各页面提示。返回地图同样不加固定等待；地图确认存档前禁止移动和互动，避免覆盖保存位置。传送门仍至少3秒，战斗和普通首次地图仍保留原加载行为。
- loading.js 使用限定路径的一次性菜单返回标记，支持同源 referrer 作为 sessionStorage 不可用时的回退；标记仅控制显示，不参与登录或奖励。初始覆盖层始终隐藏，普通入口会显式打开。
- 战胜 hollow-treant-01 后，X2700 原地显示巨大樱花树和少量像素花瓣。依据现有服务器验证的 treeCleared 状态；不使用浏览器自报击败列表。原怪物不再绘制。旧存档已有胜利也会直接显示，刷新及换世界保留；没有新增奖励、表或 SQL。
- 樱花树显示256–384px，比旁边156–204px枯树更大。城堡由最高384px调整为280–512px，并随窗口高度适应；1920×990时465px，1280×720时316px。名称继续避开顶部界面；地面保持最新55%天空/45%地面。
- 主要文件：js/loading.js、js/rpg.js、includes/loading_screen.php、js/i18n.js、tools/export_pixel_assets.cjs、tests/pixel_art.test.cjs。PHP/JS入口同步缓存20261017-sakura1。未提交或推送。

新素材由内置 image_gen 生成，使用现有工具导出为真实192×192、64色、二值透明边缘的PNG。最终文件：[restored-sakura-192.png](C:/Users/Kenny/Favorites/Downloads/English-Platform-Game/images/castle/restored-sakura-192.png)。

生成提示原文：

Use case: stylized-concept. Asset type: a transparent pixel sprite for a 2D side-scrolling fantasy RPG. One magnificent mature cherry blossom sakura tree, healed form of a defeated withered tree spirit. A massive wide lush canopy fully covered in dense pale pink and rose cherry blossoms, sturdy warm brown gnarled trunk, visible large roots touching one flat baseline. Peaceful and beautiful, no face, no eyes, no monster, no humanoid parts. Full entire tree centered, roots and every canopy edge entirely visible, generous transparent margin on all four sides. Straight-on side-view game scenery, exquisite crisp hand-pixeled 16-bit style with square pixel clusters, deep blue-purple outlines and cool violet dusk shadows, warm subtle pink highlights, limited palette. Designed to downsample cleanly to a native 192x192 pixel sprite, will be displayed much larger than neighboring dead trees. Truly transparent background and transparent holes between branches. No sky, no scenery, no landscape, no floor, no drop shadow, no grass patch, no border, no text, no watermark. Single isolated tree only.

实际浏览器验证及截图位置见 progress.md。
