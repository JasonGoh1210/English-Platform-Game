# 路牌、居中题目与上半身头像

2026-10-14，根据用户最新截图调整并检查全部相关画面。

## 调整

- 路牌由 192 缩到 128 像素，保持像素材质。枫叶镇／低语森林／旧营地道路的路牌 X420；古代遗迹路牌 X340。传送门仍为 X220／X1510，前三世界路牌与传送门图框有 40 像素间隔。长英文地名分两行。
- 战斗题目、中文翻译、提示、排句单词、已选句子和题目内的技能／道具／逃跑按钮居中。题型／难度／计时仍保留原位置，答题顺序、时限、伤害、奖励和错题总结不变。
- 四位 NPC 的普通对话、章节演出使用原生 256×256 上半身透明 PNG。罗文教学头像也更新；地图上的 64×64 站立精灵、玩家动画、建筑和四世界背景不变。
- 主体在头像框内水平／垂直居中，完整显示头部、肩膀和上身。桌面框 144 像素、图像 128 像素；手机框 88 像素、图像 80 像素，保持长文字可读。

## 新资产

| NPC | 实际项目路径 | 原生尺寸 |
|---|---|---|
| 罗文 | `images/npc/portraits/elder_256.png` | 256×256 RGBA |
| 米拉 | `images/npc/portraits/mira_256.png` | 256×256 RGBA |
| 塔拉 | `images/npc/portraits/tala_256.png` | 256×256 RGBA |
| 凯 | `images/npc/portraits/kai_256.png` | 256×256 RGBA |

使用内置 image_gen，以保留的角色原稿作编辑参考，制作上半身构图；`tools/export_pixel_assets.cjs` 导出真实 256 尺寸、透明边距及最多 256 色，并非把旧 64 站立图放大。提示集见 [PIXEL_ART_PROMPTS.md](PIXEL_ART_PROMPTS.md)。游戏运行无需生成服务或 Node。

## 修改与检查

地图与路牌：`js/rpg.js`。头像路径：`js/pixel-world.js`、`js/story-visuals.js`。对话和题目排版：`css/story-pixel.css`、`css/pixel-theme.css`。页面／教学头像：`index.php`、`battle.php`、`includes/tutorial_guide.php`。其他 JavaScript 只更新缓存版本。

PNG 测试检查实际尺寸、alpha、透明边界和居中。浏览器检查四世界路牌与传送门、英文标签、实际 E 互动，四位 NPC 的头像／章节、序章／结局、三类实际战斗题目、七种屏幕尺寸、双语、连续战斗、洞穴及存档。具体通过结果与截图记录见 `progress.md`。

没有 SQL 迁移或真实玩家数据库访问；不需要删除存档。测试使用隔离 PHP8081／MariaDB3307。桌面浏览器视口测试仍需配合实体手机的软键盘／缺口／性能检查。更新 Git 后 Ctrl+F5。
