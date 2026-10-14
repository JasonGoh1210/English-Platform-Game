# 随从、旅人商店、不同角色与落地修复

本轮从 `e2556e4` 继续开发。根据玩家截图修复所有世界的入口悬空、内部出口误用整座建筑和地下区域的未完成横线；增加随从、金币商店、六种随从外观和男女各三种不同造型。用户确认：保留打字幽魂，确保各世界使用各自怪物。

## 画面与引导

- `spriteBounds` 缓存 PNG 中实际可见的透明边界，`drawGroundedSprite` 将有像素的底部对齐行走平面；传送门、洞穴、高塔、大门、路牌、NPC、怪物和玩家共用该规则。旧男主行走帧各自有不同底部留白，现按每帧可见边界对齐，保留原文件、左右动作和角色位置。
- 内部出口和遗迹的打字入口使用 `exit-door-128.png`，不再把外面的整座钟楼／高塔搬进房间，两个遗迹入口仍有不同名称和用途。
- 室内行走平面下方是连续的 32px 像素石砖，各世界使用不同颜色；不会复制房间、窗口和入口到地面下方，也不会突然切成几条横线。户外原有地面纹理扩展到屏幕底部。
- 压缩手机和短横屏 HUD，保留金币、任务、商店等操作；短横屏行走平面留出人物空间，随从避开左下触控按钮。
- 随从默认跟随。点击「随从带路」后，根据当前主线／新手任务／洞穴房间的真实指引走到玩家前面，并提示目标名字、所在世界和方向。跨世界指向当前传送门；室内指向下一守卫或出口。点击「跟随我」恢复陪伴。不会替玩家移动、答题或领取 NPC 奖励。
- 六种外观使用同样的指引能力，外观不增加攻击力。装备保存在 MySQL；重新登录、换世界和游客升级保留。带路按钮是本次地图会话的选择，刷新后恢复跟随。

## 商店与药水

地图工具栏可打开商店；枫叶镇 X1080 的商店建筑也可按 E 进入。进入前保存当前站位，返回后继续冒险。

| 商品 | 金币 | 效果 |
|---|---:|---|
| 红宝石药水 | 12 | 存入背包；战斗中消耗一瓶恢复 40 HP，最高 100 HP |
| 向导猫头鹰 | 免费 | 默认随从 |
| 枫叶小狐 | 40 | 随从外观 |
| 星月灵猫 | 55 | 随从外观 |
| 青晶幼龙 | 65 | 随从外观 |
| 萤灯精灵 | 80 | 随从外观 |
| 信使白兔 | 100 | 随从外观 |

药水每次购买一瓶，最多持有 99 瓶。购买外观后点击「装备随从」。金币不足时禁止购买；已拥有外观不再次收费。满血不会消耗药水，设置暂停时不可喝药。原有草药仍可花 5 金币立即恢复 20 HP，两个道具并存。

购买／装备／消耗由服务器验证。复用既有 `player_coin_transactions` 的 `SHOP_PURCHASE` 分类，描述以 `EPQ:shop:` 加精简 JSON 记录；该记录由服务器写入，不接受地图存档中的库存或装备。购买时锁定玩家、验证商品／价格／余额、原子扣款与记录。客户端的数量、价格或玩家 ID 不改变真实购买。

同一购买 requestId 重试不会重复扣钱；修改同一 requestId 的商品／操作会被拒绝。购买结果未确认时浏览器保留原请求，刷新后仍可重试，并暂时禁止其他购买；十秒未响应可恢复重试。战斗使用既有动作回执保证药水只消耗一次，HP 和消耗记录一起提交或回滚。

**没有数据库迁移，没有修改数据库 schema／种子文件，也没有读取或重置实际 3306 玩家数据库。** 历史玩家默认获得猫头鹰，旧账户和既有货币余额保留。

## 男女角色

保留 `shadow`、`forest`、`arcane` 存档 ID 和性别，不重新创建角色。

| ID | 造型 |
|---|---|
| shadow | 原有暗影旅人：男主深色长斗篷；女主棕发、紫色冒险服 |
| forest | 森林游侠：男角短棕发；女角金色辫发；短披肩、皮甲、箭袋与轻便长裤 |
| arcane | 星辰法师：男角短银发；女角银色短发；尖帽、金星饰扣、短袍与青色围巾 |

新游侠／法师分别有独立画作和行走帧，形状、衣服、头发与配件都有区别。四张新图集每张七帧：一帧站立、六帧向右行走；向左镜像对应动作。图集采用 4×2 个 80×80 格子，最后一格透明；运行时统一脚底和尺寸，保留动画节奏和人物方向。原有玩家 PNG、女主图集与所选 Elder Rowan 均保留。

## 新素材（12 张 PNG）

| 路径 | 原生尺寸 |
|---|---|
| images/companions/owl-64.png | 64×64 RGBA |
| images/companions/fox-64.png | 64×64 RGBA |
| images/companions/cat-64.png | 64×64 RGBA |
| images/companions/dragon-64.png | 64×64 RGBA |
| images/companions/wisp-64.png | 64×64 RGBA |
| images/companions/bunny-64.png | 64×64 RGBA |
| images/shop/ruby-potion-32.png | 32×32 RGBA |
| images/dungeons/exit-door-128.png | 128×128 RGBA |
| assets/player/looks/male-forest-sheet.png | 320×160 RGBA |
| assets/player/looks/female-forest-sheet.png | 320×160 RGBA |
| assets/player/looks/male-arcane-sheet.png | 320×160 RGBA |
| assets/player/looks/female-arcane-sheet.png | 320×160 RGBA |

以上使用内置 image_gen 分别生成，透明背景；项目原生导出器以最近邻、128 色和二值透明输出正式文件。没有使用 CLI／外部付费素材或手动安装要求。生成原图保留在 Codex 的 generated_images 目录，实际游戏仅引用仓库正式文件。
完整实际提示词及每个正式文件路径保存在 [COMPANION_ASSET_PROMPTS.json](COMPANION_ASSET_PROMPTS.json)，共 12 个独立请求。

## 验证与文件

- 73 项 Node 测试、58 个 PHP 与 27 个 JS／工具文件语法，以及六套 PHP 规则检查。
- 独立 3307 数据库验证实际商品价格／数量／所有权／CSRF、余额不足、重复购买回执、请求冲突、库存与扣款回滚、六种外观装备持久化、游客升级、实战药水恢复／消耗、满血／空库存／设置暂停规则。
- Chrome 实际购买六种随从、丢失已提交响应后刷新并重试、确认一次扣款、换肤返回地图、建筑 E 商店、真实战斗喝药；检查中英双语及七种屏幕尺寸。四世界入口／内部大门／实际怪物核对，截图打开检查。
- 六个角色的实际地图站立、72 个左右行走姿势与刷新后的选择；新图集的 7 个独立姿势、二值透明、透明边距、统一脚底与不同轮廓有自动检查。
- 原有四世界真实外部及内部通关、遗迹左侧传送、三关同一幽魂、胜负弹窗、八段开场、四 NPC 章节、256px 头像、技能、错题复习、设置暂停和 develop-web-game 标准移动客户端回归。
- 浏览器模拟不替代实体手机软键盘、硬件性能与学生学习效果验证。

主要文件：`includes/shop.php`、`api/shop.php`、`shop.php`、`data/shop.json`、`js/shop.js`、`css/shop.css`、`js/companions.js`、`css/companions.css`；改动 `api/player.php`、`api/battle.php`、`includes/characters.php`、`index.php`、`battle.php`、`character_setup.php`、`js/characters.js`、`js/character-setup.js`、`js/rpg.js`、`js/pixel-world.js`、`js/battle.js`、`js/i18n.js` 和相关测试／导出器。共享页面／模块同步缓存版本。

## Windows 更新

```powershell
cd "C:\Users\Kenny\Favorites\Downloads\English-Platform-Game"
git pull origin main
```

更新后 Ctrl+F5；无需导入 SQL 或另行复制图片。
