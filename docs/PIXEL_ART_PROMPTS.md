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

## 2026-10-14 罗文 64 像素版本

内置 image_gen 编辑模式，透明背景，参考图为原 `images/npc/npc_elder_rowan_32.png`；该文件不覆盖。最终导出为 `images/npc/npc_elder_rowan_64.png`。

提示：Use case: identity-preserve. Input image is the edit target: this game's selected Elder Rowan sprite. Create a sharper readable native 64-by-64 logical pixel-art version shown at exact integer magnification on a genuinely transparent background. Preserve this same elderly village mentor's identity: warm friendly face, white hair and long white beard, moss-green robe with cream details, brown boots, tall wooden walking staff held on the viewer's right. Preserve a front/three-quarter view, full body and feet and staff, centered balanced silhouette with transparent margins. Only increase pixel detail and readability; retain green clothing, beard and staff and proportions. Strict uniform aligned coarse square pixel clusters representing a 64x64 source grid, crisp stepped silhouette and dark outline, limited flat colors. Clearly separated dark eyes, white beard, face, cuffs and boots. No antialiasing, blur, soft shading, glow, scene, floor, shadow, letters, watermark or extra subjects. This is a production fantasy RPG sprite, not a smooth illustration.

校园、告示牌与系统之书是引擎原生 Canvas 方格图形，通过 `tools/export_story_assets.cjs` 导出实际 PNG，没有使用图片生成服务。

## 2026-10-14 四位 NPC 的 256 像素上半身头像

内置 image_gen 编辑模式，透明背景。分别以保留的全分辨率罗文／米拉／塔拉／凯原稿为参考，保留外观与性别，仅改为上半身构图和更细的像素设计。最终实际路径见 [LAYOUT_REVIEW_AND_PORTRAITS.md](LAYOUT_REVIEW_AND_PORTRAITS.md)。

共同提示：Use case: identity-preserve. The provided image is the edit target, the existing game's selected character. Produce a clean fantasy pixel RPG dialogue portrait, actual visual design on a 256x256 logical pixel grid shown at integer magnification. Change only framing and level of detail: show the full head, both shoulders and upper torso to the waist, NO legs or full standing body. Center the face and shoulders on the square canvas, balanced space on both sides, fully readable eyes and mouth; preserve the character's gender, age, skin tone, hair and clothing identity. A friendly three-quarter face turned slightly toward the viewer, head is the focal point and occupies the upper central half, shoulders fill the lower part. All hair and both shoulders fully inside the frame with transparent margins on every side. Upper-body bust only, genuinely transparent background. Authentic sharply aligned pixel-art clusters, crisp square edges and dark pixel outline, restrained flat colors and stepped shading. No blurred resizing, antialiasing, smooth cartoon/vector edges, photography, gradients, glow, background scene, framing UI, text, logo, watermark, checkerboard or other subjects. This is the portrait asset only; game code will export the final 256x256 PNG.

主体约束：罗文保留白发、长白胡子、绿袍、米色边与右侧木杖；米拉保留棕色短发、暖肤色、橙色旅行斗篷与挎包带；塔拉保留暖棕肤色、深色束发、绿色围巾与地图；凯保留银色短发、暖棕肤色、蓝／米色袍、金色边和青色符文。
