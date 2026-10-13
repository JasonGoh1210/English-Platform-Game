# 32 像素画风与传送／战斗界面

## 本次视觉更新

四个世界改用更安静的低分辨率背景：枫叶镇的蓝色傍晚、低语森林的青绿色树林、旧营地道路的暖色落日、古代遗迹的靛蓝废墟。背景保留空白和少量远景，前景房屋、道路、洞口及地面由像素画布绘制，避免把密集背景建筑与互动建筑叠在一起。

“32×32”指原生精灵和地块尺度，而不是把整张世界地图压成一个 32×32 小图。新增 NPC、四种怪物和领域传送门都是实际 **32×32 RGBA PNG**；地图使用整数倍、最近邻放大。背景原生 **384×192**，为 12×6 个 32 像素区域，地面和洞穴使用 32 像素网格。背景最多 48 色，新增精灵最多 32 色，透明像素的 alpha 为 0，实体为 255。

保留原男女主角、全部走路帧、角色配色、用户选定的罗文 `images/npc/npc_elder_rowan_32.png`，以及已经是像素 PNG 的史莱姆和飞龙。替换米拉、塔拉、凯的程序绘制外观，以及蝙蝠、道路守卫、语法守卫、幽魂的 SVG 外观；原文件没有删除。

传送页参考用户提供的 Kingdom 选择界面排版：黑底、中央明亮世界卡片、两侧暗色真实世界预览、石色地名与木牌选择按钮。保留“领域传送门”“选择你要前往的地点”及四个世界的原名称，不复制 Kingdom 的标志或游戏内容。左右箭头、侧预览、四点选择、中央选择、传送按钮、Enter 和 Esc 继续可用；Tab 留在当前弹窗，Enter 操作当前聚焦按钮，关闭后恢复地图互动按钮焦点。

战斗页使用当前世界／洞穴的像素背景，改为深色方框、清楚的 HP、较紧凑的场景、深色答题面板和像素式按钮。怪物仍在右侧，玩家在左侧；连续答题、技能、药草、逃跑、错题总结及计时仍使用原服务器规则。手机与短横屏保留答题区域滚动。

## 新素材清单

| 用途 | 项目路径 | 原生尺寸 |
|---|---|---|
| 米拉 | `images/npc/npc_mira_32.png` | 32×32 |
| 塔拉 | `images/npc/npc_tala_32.png` | 32×32 |
| 凯 | `images/npc/npc_kai_32.png` | 32×32 |
| 领域传送门 | `images/world/pixel/realm_portal_32.png` | 32×32 |
| 蝙蝠 | `images/world/monsters/confusion-bat-32.png` | 32×32 |
| 道路守卫 | `images/world/monsters/road-guardian-32.png` | 32×32 |
| 语法守卫 | `images/world/monsters/grammar-guardian-32.png` | 32×32 |
| 洞穴幽魂 | `images/world/monsters/cave-wraith-32.png` | 32×32 |
| 四世界背景 | `images/world/pixel/maple.png`、`forest.png`、`camp.png`、`ruins.png` | 各 384×192 |
| 洞穴战斗背景 | `images/world/pixel/cave.png` | 384×192 |

新增背景优先加载，原 `images/world/*.webp` 和 `assets/world/backgrounds/*.webp` 保留为备用。Git 更新会取得所有新 PNG，不需要手动下载图片或导入 SQL；没有访问或修改真实玩家数据库。

## 文件与制作方式

`js/pixel-world.js` 负责视觉素材路径、像素地面／地标／洞穴绘制，`js/rpg.js` 接入现有地图和传送选择；`css/pixel-theme.css` 覆盖地图／战斗的视觉样式，`index.php`、`battle.php` 加载它。`js/battle.js` 为场景选择世界／洞穴主题并引用 PNG；奖励、题库、NPC 章节、世界坐标、洞穴重生、账号与存档规则不变。

12 张原始美术通过内置 image_gen 生成，不需要 API Key；各资产的提示集见 [PIXEL_ART_PROMPTS.md](PIXEL_ART_PROMPTS.md)。`tools/export_pixel_assets.cjs` 只用于把生成素材导出成原生尺寸：裁掉外围透明留白、保持比例、最近邻缩放、统一透明边界与颜色数量。洞穴和地标是引擎原生像素图形。游戏运行不需要生成工具、Node 或 Playwright。

导出工具接收开发者自己的 JSON 素材清单 `{key,source}`，需要本地 Playwright／Chrome，可通过 `EPQ_PLAYWRIGHT_MODULE`、`EPQ_CHROME_PATH` 指定安装路径；不把生成服务密钥或个人文件路径提交到仓库。

## 验证

`tests/pixel_art.test.cjs` 解码实际 PNG，检查尺寸、alpha、颜色数量、透明边界及四世界／洞穴背景；CI 同时运行原游戏和数据库测试。浏览器截图、实测传送与战斗结果记录在 `progress.md`。桌面模拟手机不等同于实体设备的软键盘和性能测试。
