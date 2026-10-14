# 四世界洞穴／高塔与打字界面

2026-10-15 更新：用户要求村庄保留村庄风貌，枫叶镇 X1580 的高塔现改为商店；当前可见挑战为森林、营地、遗迹三处。枫叶镇旧内部定义与记录只用于旧存档兼容。以下四世界设计为上一轮历史说明，当前行为见 [村庄商店与随从动作](VILLAGE_SHOP_AND_COMPANION_MOTION.md)。

本轮基于 `710e494`，按用户的新要求直接扩展现有游戏：每个世界一处可选洞穴或高塔，先击败外面的怪物再进入；遗迹传送门移到左边；打字三关只使用同一只怪物；胜负弹窗一起改为像素 UI。

## 四个挑战点

| 世界 | 入口 | 世界内 X | 外部解锁条件 | 内部守卫与学习主题 |
| --- | --- | --- | --- | --- |
| 枫叶镇 | 发条钟楼 | 1580 | 单词史莱姆胜利 | 发条夜枭；日常与礼貌，判断／找不同 |
| 低语森林 | 苔光洞穴 | 1760 | 迷惑蝙蝠胜利 | 苔菇守卫；自然与方向，判断／找不同 |
| 旧营地道路 | 烽火高塔 | 1580 | 道路守卫胜利 | 余烬魔蝎；旅行与安全，判断／句子排序 |
| 古代遗迹 | 回声洞穴 | 1680 | 语法守卫胜利 | 保留三房间：幽魂、水晶甲虫、回声飞龙；科技与信息 |

新内部守卫 HP 为 95／105／120，使用当前世界已有的主题题库、最近题目避重复、服务器判题和计时规则。原有地图怪物、题库内容、奖励、NPC 章节和技能规则保留。内部胜利有自己的奖励，重新进入时内部怪物可再次挑战。

四个可选挑战与主线独立；打字洞穴仍在遗迹 X1940，仍为三个不同词语的挑战及原有结局，但现在三个阶段使用同一只幽魂。打字洞穴也需要遗迹外部守卫的胜利；尚未解锁时，主线指引先指向语法守卫。

森林原来纯装饰的高塔由新的洞穴挑战替代；营地原有塔的位置改成可进入的烽火塔。人物、NPC 和房屋不重做。

## 传送、保存和兼容

- 用户明确要求遗迹传送门移到左侧，因此 `ruins.portalX` 从 1510 改为 **220**。其余三个世界仍为 220。遗迹路牌移动到 420，与传送门留出间距。旧角色位置不自动重置，四个世界的名称和宽度不变。
- `data/dungeons.json` 是新挑战的统一配置，PHP 地图和战斗页把相同配置传给浏览器，服务器战斗也读同一文件。
- 登录会话决定玩家；只有服务器记录的外部胜利才能解锁。逃跑或战败不解锁，浏览器伪造 `defeatedEnemyIds`、玩家 ID 或解锁字段没有权限。未解锁不能新建内部战斗或保存进入内部的状态。
- 旧奖励接口关闭前已经记录的外部胜利，以及已经完成的旧内部战斗，继续保留解锁。已经开始的旧内部战斗可以继续，不重置 HP；兼容逻辑不能创建新的未解锁战斗。
- `insideCave` 和每世界的站位现在支持全部四个世界。浏览器刷新／离开页面前即时保存最新站位，不再只等待五秒周期；战斗跳转保留预先保存的安全站位。
- 没有新增数据库表或 SQL migration，没有导入完整 schema，没有访问、清空或重置实际 3306 玩家数据库。测试使用独立 3307 数据库和临时角色。
- `echo-slime-01` 保留原存档 ID，外观和名称改为水晶甲虫，已有房间进度不丢失。原有幽魂、飞龙、玩家与 NPC 文件不覆盖。

## 像素素材

使用内置 `image_gen` 生成，使用项目现有 Canvas 导出工具适配游戏；没有使用需要 API Key 的 CLI。最终 PNG 放在 `images/dungeons/`：

| 路径（相对仓库） | 原生尺寸 | 用途 |
| --- | --- | --- |
| images/dungeons/maple-entrance-128.png | 128×128 RGBA | 发条钟楼 |
| images/dungeons/forest-entrance-128.png | 128×128 RGBA | 苔光洞穴 |
| images/dungeons/camp-entrance-128.png | 128×128 RGBA | 烽火高塔 |
| images/dungeons/ruins-entrance-128.png | 128×128 RGBA | 水晶洞口；普通／打字入口 |
| images/dungeons/maple-interior.png | 384×192 | 钟楼内部 |
| images/dungeons/forest-interior.png | 384×192 | 苔光洞穴内部 |
| images/dungeons/camp-interior.png | 384×192 | 烽火塔内部 |
| images/dungeons/ruins-interior.png | 384×192 | 回声及打字场景 |
| images/dungeons/clockwork-owl-64.png | 64×64 RGBA | 发条夜枭 |
| images/dungeons/moss-sentinel-64.png | 64×64 RGBA | 苔菇守卫 |
| images/dungeons/ember-scorpion-64.png | 64×64 RGBA | 余烬魔蝎 |
| images/dungeons/crystal-beetle-64.png | 64×64 RGBA | 水晶甲虫 |

人物及建筑 PNG 的 alpha 为 0／255，周围是真透明，洞口的黑色内部保留不透明。怪物最多 128 色，背景最多 96 色；导出保留金色灯光和青紫水晶。背景尺寸能被 32 整除；地图使用关闭平滑的整数缩放，入口 2／3 倍、怪物 2 倍。打字幽魂为原有 64px PNG，以 128px 显示。

## 实际生成提示词组

怪物共同约束：ONE production game sprite; strict detailed 64x64 pixel-art aesthetic for a fantasy RPG; hard square pixels, limited palette, dark one-pixel outline; no anti-aliasing, gradients, soft glow or text; one complete centered silhouette, bottom-aligned feet, generous transparent margins; actual transparent RGBA; no scene, floor or checkerboard; export to native64 and render nearest-neighbor。

- Clockwork Owl：small CLOCKWORK OWL guardian for a fantasy English-learning RPG, full body facing slightly left, bronze gears and burgundy scarf, luminous amber eyes, cute but formidable。
- Moss Sentinel：MOSS MUSHROOM SENTINEL, stubby mushroom creature, broad emerald cap, cream face, small wooden shield, forest-vine arms, full body facing slightly left。
- Ember Scorpion：EMBER SCORPION, stout charcoal-black armor, rusty copper claws, raised segmented tail, small glowing orange segments, full body facing slightly left。
- Crystal Beetle：CRYSTAL BEETLE, six-legged chunky pale violet stone carapace, blue crystal horn, cyan eyes, crystal wings tightly folded, full body facing slightly left。

入口共同约束：ONE production side-view fantasy RPG environment sprite; front elevation for a side-scroller; detailed native128x128 pixel-art aesthetic; hard square pixels, limited palette, dark outlines; no anti-aliasing, painterly effects, soft gradients or soft glow; complete centered roof-to-base asset with transparent margins; large open doorway; actual transparent RGBA; no surrounding landscape, floor plane, people, text or checkerboard。

- Maple：village CLOCK TOWER entrance, tall narrow gray stone tower, red-brown peaked roof, big brass clock face, wooden arch door OPEN to dark interior, amber lanterns, worn brickwork。
- Forest：MOSS CAVE entrance, irregular natural forest rock arch, thick emerald moss, hanging roots, cyan mushrooms, wide OPEN dark mouth; no built brick doorway。
- Camp：BEACON TOWER entrance, tall ruined ochre stone watchtower, broken battlements, small red banner, flame brazier on top, OPEN dark arch doorway, sturdy wide base。
- Ruins：CRYSTAL CAVE entrance, jagged navy stone arch, violet/cyan crystal clusters, rune carvings, wide OPEN black mouth; avoid conventional symmetric brick doorway。

背景共同约束：ONE production SIDE-SCROLLING 2D fantasy RPG interior; landscape2:1; strict32x32 tile-based pixel art, hard edges, restrained palette, polished16-bit JRPG; no smooth gradients, anti-aliasing, painterly brushwork, vector triangles, blur or modern UI; flat unobstructed horizontal stone walkway at75%height, pixel masonry below; detail on distant walls and edges, readable central play area; no characters, enemies, foreground obstacles, middle doors, labels, text, logos or UI; export384x192 nearest-neighbor。

- Maple：ancient village clock tower, walnut beams, brass gears high on the far wall, amber lanterns, dusk-blue windows, worn stone walls; cozy adventurous bronze/slate blue。
- Forest：luminous moss cave, irregular rock arches, vines and roots overhead, layered distant moss ledges, teal mushrooms and emerald crystals; deep forest green/cyan, readable medium brightness。
- Camp：ruined beacon tower, terracotta masonry, narrow sunset-mountain windows, rust-red braziers, old banners and cracked pillars; ochre/charcoal/muted ember orange。
- Ruins：ancient crystal cavern, irregular navy rock roof/stalactites, violet/cyan crystal veins, broken rune pillars, distant small pools; indigo/purple with readable pale-cyan accents。

## 界面和验证

打字界面、输入框、字母提示、按钮和胜负结果改为方形像素边框；取消旧渐变圆角和背景模糊，保留答案／解释／词义、重试、回地图、三关结束后的原剧情。结果弹窗固定在屏幕中间，短横屏可以滚动内容，按钮至少44px，支持减少动画。

- 68 项 Node 测试、全部 PHP／JS 语法和六套 PHP 规则检查。
- 独立数据库验证四世界实际外部／内部胜利、逃跑不解锁、所属玩家／CSRF／伪造存档、主题与计时、各世界内部站位、旧胜利和已开始战斗的兼容；原有任务、游客升级、战后复习和技能扣点一起回归。
- 实际 Chrome 从封印入口开始，完成四个外部怪物与六个内部怪物的战斗、退出／重新进入、短时间移动后的刷新、遗迹左侧传送及三关同一幽魂；胜利／失败在七种屏幕尺寸检查，验证双语任务指引及原结局。实际截图已打开检查。
- 原有四世界传送／战斗／错题、NPC 开场与章节、技能树和 develop-web-game 标准移动客户端回归。Chrome 模拟不替代真实手机软键盘与性能验证。
- 额外检查七种屏幕尺寸下的四个入口、四种内部场景和四只新怪物战斗画面，共 84 张实际截图；确认无横向溢出、怪物及血条完整显示、入口与内部状态正确。

主要改动文件：`data/dungeons.json`、`includes/dungeons.php`、`api/battle.php`、`api/game_state.php`、`api/player.php`、`includes/battle_rules.php`、`includes/quests.php`、`includes/quest_guide.php`、`index.php`、`battle.php`、`js/rpg.js`、`js/battle.js`、`js/quest-guidance.js`、`js/pixel-world.js`、`js/i18n.js`、`css/dungeon-pixel.css`、`tools/export_pixel_assets.cjs`；相关测试及共享模块缓存版本同步。

## Windows 更新

```powershell
cd "C:\Users\Kenny\Favorites\Downloads\English-Platform-Game"
git pull origin main
```

浏览器 Ctrl+F5。本轮没有 SQL 导入或手动安装素材步骤。
