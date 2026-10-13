# Google 登录与首次创建角色

## 使用流程

- 登录／注册只处理账号，不要求角色名字。新账号、游客或首次 Google 登录成功后进入 `character_setup.php`。
- 创建角色时填写名字，或点击骰子换随机名字；选择男／女，以及暗影、森林、奥术三种外观。保存后继续已有 Opening Story 和长老教学。
- 名字、外观和性别保存到 MySQL。重复提交不会重建角色。旧账号继续使用原名字、原精灵和原存档，不强制重新创建。
- 男角色保留原造型；女角色使用独立的长发女孩透明 PNG，包含站立和六帧左右行走。三种配色在两种造型上都可使用。随机名字每种性别有 1,600 个中英组合。
- 从地图的“账号设置”可绑定 Google。游客升级保留同一个 user_id、player_id、角色、剧情、金币和 XP。密码账号绑定后仍可用原密码登录。
- Google 身份以服务器验证过的 `sub` 为准。邮箱撞到其他账号时不会自动合并：先登录原账号再绑定。已绑定到其他角色的 Google 账号不能覆盖当前存档。

## 更新现有 XAMPP 数据库

1. 在 phpMyAdmin 导出 `english_power_quest` 备份。
2. 确认之前的 002–005 更新已完成。只缺本次更新时，选择该数据库，导入 `database/migrations/006_character_profiles.sql`。
3. 006 只新增 `player_character_profiles` 表；不改写旧名字、余额或进度，可重复执行。
4. 不要向现有数据库导入完整 schema 或 demo seed。只有全新空数据库才使用最新 `database/english_power_quest_schema.sql`。
5. 更新代码后浏览器按 Ctrl+F5，再打开 `http://localhost/FYP/login.php`。

`git pull` 只更新文件，不会执行 SQL。本次没有对你的现有 XAMPP 玩家数据库执行迁移。

## 启用 Google 登录

当前未配置 Client ID，页面会显示 Google 按钮和“暂未启用”；账号密码与游客照常可用。功能已实现，但尚未使用真实 Google 账号完成登录验证。

1. 在 [Google Cloud 客户端页面](https://console.cloud.google.com/auth/clients) 创建／选择项目。
2. 在 Google Auth Platform 的 Branding 页面填写应用名称和支持邮箱；按项目状态配置 Audience／测试用户。
3. 创建 **Web application** 类型 OAuth 客户端。
4. 在 Authorized JavaScript origins 添加实际来源：XAMPP 默认是 `http://localhost`；若使用另一个端口，同时添加 `http://localhost:端口`。来源没有 `/FYP` 或其他路径。部署时添加自己的 HTTPS 来源。
5. 将 `config/google.example.php` 复制为 `config/google.local.php`，填写公开的 `client_id`。此文件已被 Git 忽略；也可设置服务器环境变量 `EPQ_GOOGLE_CLIENT_ID`，环境变量优先。
6. 刷新登录页，正式 Google 按钮由 Google SDK 渲染。首次登录创建角色，再次登录进入同一存档。

本项目使用 Google Identity Services 弹窗的 JavaScript callback，将 ID token 发给 PHP 验证；不使用授权码交换，无需配置 Client Secret，也无需为此回调填写 redirect URI。不要把 Secret 放入聊天、JavaScript 或 Git。

官方说明：[客户端配置](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)、[JavaScript API](https://developers.google.com/identity/gsi/web/reference/js-reference)、[服务器验证 ID token](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)。

## 检查与常见问题

- Google 按钮仍是“暂未启用”：确认本地配置文件名字正确，或 Apache 已读取环境变量；环境变量改变后重启 Apache。
- `origin_mismatch`：添加浏览器地址栏实际的来源，检查 http／https、localhost、端口是否一致。
- Google 弹窗空白：检查浏览器弹窗权限及 Apache 的 Cross-Origin-Opener-Policy；若已设置严格策略，参考官方说明允许登录弹窗。localhost 的 Referrer-Policy 设置也参考官方配置页。
- PHP 验证连接失败：确保启用了 curl、openssl、mysqli，并使用有效 CA 证书。不要关闭 HTTPS 证书验证。失败后刷新登录页再试。
- 未完成角色设置时仍可恢复同一个游客，游戏 API 会暂时拒绝访问，防止跳过设置。
- 试新流程请使用独立浏览器／无痕窗口。保留现有未升级游客的恢复 cookie，不要为了测试退出旧游客。

## 代码、素材与验证

页面：`login.php`、`register.php`、`character_setup.php`、`account.php`。

账号与资料：`includes/characters.php`、`includes/google.php`、`api/google_login.php`、`config/google.php`。

前端：`js/character-setup.js`、`js/characters.js`、`js/google-signin.js`、`css/auth.css`；地图、战斗和打字肖像使用同一角色资料。

女角色素材：`assets/player/female/female_adventurer_sheet.png`，生成提示词和帧布局见该目录的 README。Canvas 按 alpha 边界提取七帧并统一脚底，向左动作镜像；开场／结局主角称谓随性别显示她／she。Google 登录入口与游客入口同组，位于游客入口上方。

原始男角色素材保持不变：`assets/player/png_frames/Player_Stand.png` 和左右各六帧 `player_walk_*` PNG。额外配色由 Canvas 生成，保留尺寸、透明通道和方向。长老仍使用 `images/npc/npc_elder_rowan_32.png`。

测试包含名字和配色、RSA 签名与声明、CSRF、首次设置、旧账号、游客升级、Google 身份复用及冲突保护。真实 Google 弹窗需配置 Client ID 后再测试。

## 本次变更文件

- `.github/workflows/php-js-lint.yml`
- `.gitignore`
- `README.md`
- `account.php`
- `api/bootstrap.php`
- `api/google_login.php`
- `api/player.php`
- `battle.php`
- `character_setup.php`
- `config/google.example.php`
- `config/google.php`
- `css/auth.css`
- `css/style.css`
- `database/english_power_quest_schema.sql`
- `database/migrations/006_character_profiles.sql`
- `docs/GOOGLE_SIGNIN_AND_CHARACTERS.md`
- `docs/GUEST_ACCOUNTS_AND_DATABASE.md`
- `includes/auth.php`
- `includes/characters.php`
- `includes/google.php`
- `includes/google_button.php`
- `includes/guest.php`
- `index.php`
- `js/battle.js`
- `js/character-setup.js`
- `js/characters.js`
- `js/google-signin.js`
- `js/i18n.js`
- `js/rpg.js`
- `js/save-status.js`
- `login.php`
- `progress.md`
- `register.php`
- `tests/battle_flow_smoke.php`
- `tests/character_flow_smoke.php`
- `tests/characters.test.cjs`
- `tests/google_token_test.php`
- `tests/guest_flow_smoke.sh`
