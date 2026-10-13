# 像素素材提示集

使用内置 image_gen；所有生成素材是原创，用户的 Kingdom 图片仅作为界面布局与质感参考，没有作为需要修改／复制的目标图。

以下记录初次生成的提示集。2026-10-14 根据用户要求，改为从保留的原始大图导出 64×64 精灵，最多 128 色；没有放大旧 32×32 文件，也没有重新生成角色。当前项目路径见 PIXEL_ART_AND_UI.md。

精灵原始共同规格：single original side-view fantasy RPG sprite; authentic coarse 32×32 logical pixel design shown at integer magnification; aligned square clusters, stepped contours, limited palette, dark outline, full centered silhouette with transparent margins; genuinely transparent background; no scene, ground shadow, lettering, UI, logo, watermark or other subjects; no antialiasing, smooth shading, gradients or bloom. 生成大图经过原生尺寸导出后，实际 PNG 的尺寸、alpha 和颜色上限由测试验证。

| 素材 | 主体提示 |
|---|---|
| Mira | Female wandering merchant, short brown hair, rust-orange travelling cloak, dark trousers, warm skin, boots and a small satchel; friendly side view facing slightly right. |
| Tala | Adult woman camp guide, warm brown skin, dark tied-back hair, moss-green scarf/travel coat, brown boots, folded cream map and tiny warm lantern; face slightly right. |
| Kai | Adult man ancient library/system caretaker, light brown skin, short silver hair, navy and muted teal robes, dark boots, small cyan rune tablet at his side; face slightly left. |
| Realm portal | Front-facing squat gray-blue stone arch, blocky stepped top and side pillars, tiny gold runes, flat deep-teal opening with cyan pixel specks, worn stone base; portal only. |
| Cave Wraith | Small floating indigo hooded ghost, torn stepped robe/tail, two cyan square eyes and tiny cyan chest rune; compact readable silhouette. |
| Confusion Bat | One tiny purple forest bat with spread indigo wings, stepped edges and small amber eyes; compact symmetrical silhouette. |
| Road Guardian | Squat sandstone/rust-brown rectangular stone golem, thick square arms and feet, amber square eyes and small amber chest rune. |
| Grammar Guardian | Squat slate-blue ancient library stone golem, thick square arms and feet, cyan square eyes and small cyan chest rune. |

背景共同规格：panoramic background layer for a side-scrolling 32×32-tile fantasy pixel RPG; original coarse 16-bit pixel art with aligned clusters and stepped contours; wide 2:1 composition; quiet backdrop with two or three depth layers, generous empty sky in upper half, restrained contrast; scenery along lower half, no foreground gameplay platform, characters, monsters, text, interface or logos. Calm fantasy atmosphere; do not copy another game's artwork. 导出为 384×192 最近邻像素背景、最多 48 色。

| 世界 | 场景提示 |
|---|---|
| Maple Town | Muted blue dusk sky, small cream pixel moon near upper right, distant blue mountains and gentle green hills, a few tiny warm cottage silhouettes far away; open center, no detailed village or giant buildings. |
| Whispering Forest | Muted teal evening sky, low blue hills, two simple layers of dark-green pine silhouettes along the lower edge, a few amber fireflies; open center, no dense leaf texture, giant trees or mushrooms. |
| Old Camp Road | Muted peach sunset sky, purple-brown mountains in two flat layers, a few small pine silhouettes and a tiny far-right camp; open center, no dramatic rays or dense texture. |
| Ancient Ruins | Muted indigo twilight sky, small pale pixel moon, low purple hills, a few widely spaced broken gray-blue towers; open center, no huge castle, magical swirls or ornate architecture. |

洞穴背景与小型地标由原生 Canvas 方格绘制，没有调用外部图片 API。旧素材和原始生成图保留，游戏只引用项目中的最终 PNG。
