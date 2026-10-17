# 背包、图标菜单与城门钥匙

2026-10-17，本地实现；未提交或推送。

- 右上角的五个入口使用代码绘制的像素 SVG：技能书、背包、随从、任务卷轴、设置。保留中英文名称、键盘焦点与按下效果。村庄商店的实体互动单独进入 shop.php，离开地图前继续保存位置。
- backpack.php 显示真实金币、药水库存、任务钥匙，以及已拥有的随从。可切换随从；药水沿用战斗中的道具使用方式。背包不显示购买按钮。继续共用 api/shop.php 的库存与装备校验；装备重试保留同一请求，和商店购买使用不同的待确认记录。
- 古代遗迹室外宽 5200：回声洞穴 X1680；枯树 X2080、2390、2960、3270、4110；枯木树怪 X2700；城门侍卫 X3580；封印城门 X3820；最终城堡 X4480。前段建筑间距也拉开。其他三个世界与回声洞穴内部大小保持原值。
- 原语法守卫胜利后可挑战枯木树怪，再挑战城门侍卫。击败侍卫获得一把任务钥匙，背包可查。城门前按 E／互动使用，门会变为敞开图片，可继续向右走到最终 Boss。随从与任务面板依次指引这些目标。
- includes/castle.php 根据 verified_battles 的胜利记录派生树怪、侍卫、钥匙状态；verified_quest_claims 的 castle:gate-open 记录永久开门。不信任浏览器自报的胜利、钥匙或门状态。新战斗检查前置条件与保存位置，开门检查位置和 CSRF；重复请求不重复消耗。原 story:ending 存档仍可重玩。
- 最终 Boss 保留三道拼写封印、原结局、原奖励与回声幽魂。没有新增 SQL 表或手工导入步骤；正式玩家数据库未被测试修改。

主要文件：includes/map_toolbar.php、css/map-toolbar.css、backpack.php、css/backpack.css、js/shop.js、includes/castle.php、data/world_layout.json、js/rpg.js、js/battle.js、js/quest-guidance.js、js/i18n.js，以及相关 API 与测试。同步刷新公共脚本缓存版本 20261017-castleroad2。

新美术由内置 image_gen 生成，再用已有 tools/export_pixel_assets.cjs 导出真实尺寸、64 色、透明边缘的 PNG；没有以 SVG 替代怪物。成品全部在仓库内：

| 文件 | 尺寸 | 生成主题 |
| --- | --- | --- |
| images/castle/withered-tree-96.png | 96×96 | 单棵枯萎扭曲的无叶树，完整树枝与根部，无怪物面孔 |
| images/castle/hollow-treant-96.png | 96×96 | 枯木树怪，树洞面孔、琥珀色眼睛、枝爪与分开的根腿 |
| images/castle/gate-warden-96.png | 96×96 | 深色板甲城门侍卫，酒红披布、长戟、重盾，完整双脚 |
| images/castle/castle-gate-128.png | 128×128 | 闭合的哥特石拱双木门、金锁孔、两侧火盆 |
| images/castle/castle-gate-open-128.png | 128×128 | 上图编辑版本，保留拱门、柱子、色彩与火盆，仅让双门打开，通道透明 |

共同生成提示：Use case: stylized-concept. Asset type: transparent pixel sprite for existing 2D fantasy browser RPG. Crisp hand-pixeled 16-bit style, square pixel clusters, deep navy outlines, restrained 32-color palette, warm amber accents, blue-violet shadow colors to fit ruined dusk landscape. Entire subject centered and completely visible with transparent empty margins on every side. Single isolated asset only. Truly transparent background. No floor, no cast shadow, no backdrop, no words, no watermark. Designed to downsample cleanly to native 96x96 pixels (castle gate: 128x128) with nearest-neighbor display. Produce only this asset.

每张图片的主体提示分别为：

1. One single withered dead tree, full bare twisted branches, gnarled dark brown trunk, exposed roots, no leaves, no face, no monster. RPG scenery sprite, side view.
2. One terrifying walking tree monster, full body, twisted dead trunk torso with a hollow screaming face and amber eyes, big branch claw arms, two clearly separate root legs. Three-quarter front facing left, combat-ready. Distinct from stone golems and ghosts.
3. One imposing armored castle gate warden, full body, charcoal plate armor with burgundy cloth, closed hornless helmet with amber slit eyes, a large halberd in one hand and a heavy dark shield in the other. Feet on same baseline, three-quarter front facing left. No mount, no background.
4. One standalone closed gothic castle gate, wide double iron-banded dark wood doors, massive stone arch, subtle golden keyhole, two short stone pillars with amber braziers. No castle tower, no building behind, no characters. Straight-on side scrolling adventure scenery.
5. Edit this game gate sprite to its UNLOCKED OPEN state. Preserve exactly the same arch silhouette, two pillars, stone colors, gold accents, fire braziers, straight-on view, canvas dimensions, outer placement and pixel art style. Change ONLY the wooden double doors: both door leaves swing fully open to their respective sides so the central entire arched doorway is a truly transparent empty passage, showing no background, no interior room and no black rectangle. Keep a little of the door leaves visible at the sides. Output a single complete isolated open gate sprite, genuinely transparent background, no text.

验证：tests/castle_road_flow_smoke.php 覆盖真实答题胜利、前置战斗、远程请求拒绝、伪造钥匙拒绝、逃跑无钥匙、位置、CSRF、所属角色、开门重试、持久化与原拼写入口。原剧情／战斗／四世界洞穴检查均通过。浏览器截图与最终检查记录见 progress.md。
