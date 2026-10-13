# 像素对话、建筑比例与开场界面

2026-10-14：按用户截图调整普通对话头像、罗文外观、地图建筑和开场／章节分镜，继续使用原 PHP/MySQL/Canvas 项目与剧情流程。

## 画面改动

- 对话不再使用老人 emoji。四位 NPC 与地图使用同一套 PNG，头像栏显示角色上半身；告示牌、洞穴提示使用各自的像素图标。
- 罗文新增 64×64 版本，保留绿袍、白胡子、木杖。原 `images/npc/npc_elder_rowan_32.png` 文件保留作地图备用；地图、章节、对话和教学提示引用新 64 版本。
- 房屋／遗迹显示 256 像素，石塔 320 像素，帐篷 224 像素，告示牌／洞口 192 像素，人物保持原尺寸。地标有像素门窗、石砖、横梁和阶梯；坐标、传送位置和互动距离不变。
- 开场新增校园像素背景，取消圆形轨道、柔光和 SVG 人像，改为方框场景、独立文字栏、角色标签、进度和 44 像素按钮。保留玩家实际名字、性别和选定角色，以及全部序章／章节／结局的原文和顺序。
- Enter 操作当前聚焦的继续／跳过按钮，Tab 留在剧情弹窗，Esc 跳过；退出恢复地图互动按钮焦点。小屏幕的长段落在文字栏内滚动，减少动态效果设置停止场景移动。

## 素材与文件

| 素材 | 项目路径 | 尺寸／制作方式 |
|---|---|---|
| 罗文 | `images/npc/npc_elder_rowan_64.png` | 64×64 RGBA；内置 image_gen 参考原罗文制作 |
| 告示牌 | `images/world/pixel/wayfinder_sign_64.png` | 64×64 RGBA；原生 Canvas 方格 |
| 系统之书 | `images/world/pixel/system_book_64.png` | 64×64 RGBA；原生 Canvas 方格 |
| 校园开场 | `images/world/pixel/opening-campus.png` | 384×192；原生 Canvas 方格 |

`js/story-visuals.js` 共用头像路径；`js/rpg.js` 接入现有分镜／对话，`js/pixel-world.js` 绘制地标，`css/story-pixel.css` 覆盖地图对话／故事界面。`index.php` 接入头像与样式；`battle.php`、`includes/tutorial_guide.php` 更新教学头像。已有角色动画、怪物、音效、题库、奖励和账户规则不变。

`tools/export_story_assets.cjs` 导出原生校园／书／告示牌，`tools/export_pixel_assets.cjs` 导出生成的罗文。工具开发时需要 Playwright／Chrome；游戏运行不需要 Node 或 API Key。生成提示见 [PIXEL_ART_PROMPTS.md](PIXEL_ART_PROMPTS.md)。

## 验证与部署

PNG 测试检查尺寸、透明边界、alpha 和颜色；头像测试检查 NPC／告示牌／洞穴对应文件。隔离 PHP8081／MariaDB3307 的 Chrome 实测覆盖七种屏幕尺寸、男／女角色、原有全部序章分镜、键盘操作、四位 NPC 章节／普通对话、地图地标和洞穴／结局。详细结果见 `progress.md`。

无需 SQL 迁移，没有访问真实玩家数据库，不需要清除存档或重建账号。更新 Git 后 Ctrl+F5 刷新。桌面模拟屏幕不能替代实体手机软键盘、缺口和性能测试。
