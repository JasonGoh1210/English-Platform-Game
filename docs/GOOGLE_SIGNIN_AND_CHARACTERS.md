# Google 登录与首次创建角色

## 使用流程

- 登录／注册只处理账号，不要求角色名字。新账号、游客或首次 Google 登录成功后进入 `character_setup.php`。
- 创建角色时填写名字，或点击骰子换随机名字；选择男／女，以及暗影旅人、森林游侠、星辰法师三种外观。保存后继续已有 Opening Story 和长老教学。
- 名字、外观和性别保存到 MySQL。重复提交不会重建角色。旧账号继续使用原名字、原精灵和原存档，不强制重新创建。
- 两种性别各有三种独立造型，森林游侠与星辰法师使用独立精灵和动作，并非仅换颜色。原暗影男女素材继续保留。随机名字每种性别有 1,600 个中英组合。
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

Google 登录需要每个部署环境配置自己的真实 Client ID。未配置时页面显示“暂未启用”，账号密码与游客照常可用。本机已配置用户提供的 ID，并通过实际 XAMPP 页面验证 Google 官方按钮、手机布局和服务器公钥连接；用户实际选择账号并授权的流程仍需亲自完成。其他部署环境按以下步骤配置。

1. 在 [Google Cloud 客户端页面](https://console.cloud.google.com/auth/clients) 创建／选择项目。
2. 在 Google Auth Platform 的 Branding 页面填写应用名称和支持邮箱；Audience 按实际使用者选择，面向普通 Google 用户时选 External。若控制台提示需要测试用户，添加实际测试邮箱。
3. 创建 **Web application** 类型 OAuth 客户端。
4. 在 Authorized JavaScript origins 添加实际来源：本机目前使用 `http://localhost`，登录页面为 `http://localhost/FYP/login.php`。若使用另一个端口，同时添加 `http://localhost:端口`。来源没有 `/FYP` 或其他路径。`localhost` 与 `127.0.0.1` 是不同来源；优先统一使用 localhost。部署时添加自己的 HTTPS 来源。
5. 将 `config/google.example.php` 复制为 `config/google.local.php`，填写公开的 `client_id`。此文件已被 Git 忽略；也可设置服务器环境变量 `EPQ_GOOGLE_CLIENT_ID`，环境变量优先。
6. Ctrl+F5 刷新登录页，正式 Google 按钮由 Google SDK 渲染。首次登录创建角色，再次登录进入同一存档；游客先从游戏的账号设置绑定，保留原角色。

创建后只需要把以 `.apps.googleusercontent.com` 结尾的公开 Client ID 填入配置，不需要发送密码或 Client Secret。正式配置使用自己的真实 ID；示例 ID 仅用于隔离测试。本机 `config/google.local.php` 已被 Git 忽略，不随代码推送。

本项目使用 Google Identity Services 弹窗的 JavaScript callback，将 ID token 发给 PHP 验证；不使用授权码交换，无需配置 Client Secret，也无需为此回调填写 redirect URI。不要把 Secret 放入聊天、JavaScript 或 Git。

官方说明：[客户端配置](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid)、[JavaScript API](https://developers.google.com/identity/gsi/web/reference/js-reference)、[服务器验证 ID token](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token)。

## 检查与常见问题

- Google 按钮仍是“暂未启用”：确认本地配置文件名字正确，或 Apache 已读取环境变量；环境变量改变后重启 Apache。
- 公开 Client ID 格式错误会保持未启用；不要填写项目编号、客户端密钥、网页网址或教程里的示例值。
- `origin_mismatch`：添加浏览器地址栏实际的来源，检查 http／https、localhost、端口是否一致。
- Google 弹窗空白：检查浏览器弹窗权限及 Apache 的 Cross-Origin-Opener-Policy；若已设置严格策略，参考官方说明允许登录弹窗。localhost 的 Referrer-Policy 设置也参考官方配置页。
- PHP 验证连接失败：确保启用了 curl、openssl、mysqli，并使用有效 CA 证书。不要关闭 HTTPS 证书验证。Google 按钮加载超过 15 秒会显示重试；提交超过 20 秒会检查登录结果并提供刷新入口。
- 未完成角色设置时仍可恢复同一个游客，游戏 API 会暂时拒绝访问，防止跳过设置。
- 试新流程请使用独立浏览器／无痕窗口。保留现有未升级游客的恢复 cookie，不要为了测试退出旧游客。

可以在项目目录运行 `C:\xampp\php\php.exe tools\google_check.php`。它只检查配置、PHP 扩展和 Google 公钥的 HTTPS 连接，不连接玩家数据库。退出码 0 表示已具备配置和连接条件，2 表示仍缺 Client ID，1 表示依赖或连接失败；这不是实际用户授权成功的证明。`--offline` 可跳过网络检查。该工具不能从网页访问。

## 2026-10-15 登录可靠性更新

- 每个页面使用独立 request ID／nonce，最多保留八个未过期页面，有效十分钟。打开第二个标签页不会覆盖第一个；登录或绑定成功后统一消耗，切换账号会清空旧请求。
- 失败的签名、账号冲突或 Google 服务暂时断网不会提前消耗页面凭证。已登录时绑定限定原 user_id／player_id，不允许覆盖其他角色。
- 提交期间仅暂停 Google 控件，防止重复提交。凭证不写入 localStorage、URL、日志或数据库。
- 回包丢失时只发送只读状态检查，确认同一浏览器刚完成的登录；五分钟内有效，退出或换账号后清除。不会自动重发同一凭证。目标页面仅允许游戏地图／角色设置。
- 公钥按 Google Cache-Control／Age 缓存在服务器会话，最长一天；过期不使用，发现新 key ID 后有节制地刷新。HTTPS 证书验证一直开启。
- 登录、注册与账号页使用 no-store、支持弹窗的 COOP，以及适合本机 HTTP／正式 HTTPS 的 Referrer-Policy。
- 无数据库结构更新，无需重新导入 SQL。旧账号、剧情、背包、随从和商店规则保持原有数据。

验证包含三层：PHP 签名与会话单元测试、前端重试／超时测试，以及独立数据库中的 `tests/google_http_smoke.php`。后者通过专用测试会话目录缓存临时 RSA 公钥，再向真正的 HTTP 登录接口发送签名测试凭证，覆盖新建／再次登录、游客绑定、冲突保护、金币／地图／皮肤／药水保留、旧游客令牌撤销和原密码可用。它不提供生产 HTTP 旁路，也不访问正式会话或玩家数据。GitHub MySQL 8／MariaDB 10.4 均执行这项测试。

浏览器测试额外验证 SDK 断网重试、移动端布局，以及实际接口已提交但回包损坏后自动恢复。测试 SDK 按钮是受控替身，不代表真实 Google 弹窗已通过；真实授权需配置用户自己的 Client ID 后完成。

## 代码、素材与验证

页面：`login.php`、`register.php`、`character_setup.php`、`account.php`。

账号与资料：`includes/characters.php`、`includes/google.php`、`api/google_login.php`、`config/google.php`。

前端：`js/character-setup.js`、`js/characters.js`、`js/google-signin.js`、`css/auth.css`；地图、战斗和打字肖像使用同一角色资料。

女角色素材：`assets/player/female/female_adventurer_sheet.png`，生成提示词和帧布局见该目录的 README。Canvas 按 alpha 边界提取七帧并统一脚底，向左动作镜像；开场／结局主角称谓随性别显示她／she。Google 登录入口与游客入口同组，位于游客入口上方。

原始男角色素材保持不变：`assets/player/png_frames/Player_Stand.png` 和左右各六帧 `player_walk_*` PNG。新造型详见 `docs/COMPANIONS_SHOP_AND_HEROES.md`。长老仍使用 `images/npc/npc_elder_rowan_32.png`。

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
