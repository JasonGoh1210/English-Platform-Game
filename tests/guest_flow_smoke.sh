#!/usr/bin/env bash
set -euo pipefail

mkdir -p /tmp/epq_web
ln -s "$GITHUB_WORKSPACE" /tmp/epq_web/FYP
php -S 127.0.0.1:8081 -t /tmp/epq_web >/tmp/epq_php_server.log 2>&1 &
server_pid=$!
trap 'kill "$server_pid" || true; cat /tmp/epq_php_server.log' EXIT
sleep 2

base="http://127.0.0.1:8081/FYP"
cookies=$(mktemp)
login=$(curl -fsS -c "$cookies" -b "$cookies" "$base/login.php")
csrf=$(printf '%s' "$login" | grep -oP 'name="csrf_token" value="\K[a-f0-9]{64}' | head -n1)
test -n "$csrf"

curl -fsS -D /tmp/epq_headers.txt -o /tmp/epq_guest_post.html -c "$cookies" -b "$cookies" \
  --data-urlencode 'guest_mode=1' --data-urlencode 'guest_name=SmokeHero' \
  --data-urlencode "csrf_token=$csrf" "$base/login.php"
grep -q 'Location: /FYP/index.php' /tmp/epq_headers.txt

guest=$(mysql -h 127.0.0.1 -uroot -ptestpassword -N -s english_power_quest \
  -e "SELECT CONCAT(u.user_id,':',p.player_id) FROM users u JOIN players p ON p.user_id=u.user_id WHERE u.account_type='guest' AND p.display_name='SmokeHero' ORDER BY p.player_id DESC LIMIT 1")
test -n "$guest"
user_id=${guest%%:*}
player_id=${guest##*:}

map=$(curl -fsS -c "$cookies" -b "$cookies" "$base/index.php")
printf '%s' "$map" | grep -q 'SmokeHero'
csrf=$(printf '%s' "$map" | grep -oP 'name="csrf_token" value="\K[a-f0-9]{64}' | head -n1)

story=$(curl -fsS -b "$cookies" -c "$cookies" -H 'Content-Type: application/json' \
  -d "{\"csrfToken\":\"$csrf\",\"completed\":true}" "$base/api/story_progress.php")
printf '%s' "$story" | jq -e '.ok == true'
test "$(mysql -h 127.0.0.1 -uroot -ptestpassword -N -s english_power_quest -e "SELECT story_intro_seen FROM players WHERE player_id=$player_id")" = 1

saved=$(curl -fsS -b "$cookies" -c "$cookies" -H 'Content-Type: application/json' \
  -d "{\"csrfToken\":\"$csrf\",\"state\":{\"currentRealmId\":\"forest\",\"playerX\":555,\"questStep\":2,\"defeatedEnemyIds\":[\"bat-01\"]}}" \
  "$base/api/game_state.php")
printf '%s' "$saved" | jq -e '.ok == true'
loaded=$(curl -fsS -b "$cookies" "$base/api/game_state.php")
printf '%s' "$loaded" | jq -e '.state.currentRealmId == "forest" and .state.playerX == 555'
test "$(mysql -h 127.0.0.1 -uroot -ptestpassword -N -s english_power_quest -e "SELECT w.world_order FROM players p JOIN worlds w ON w.world_id=p.current_world_id WHERE p.player_id=$player_id")" = 2

reward=$(curl -fsS -b "$cookies" -H 'Content-Type: application/json' \
  -d "{\"csrfToken\":\"$csrf\",\"xpDelta\":20,\"coinDelta\":10,\"englishPowerDelta\":1,\"englishSkillCode\":\"VOCABULARY\",\"sourceType\":\"QUESTION\"}" \
  "$base/api/save_progress.php")
printf '%s' "$reward" | jq -e '.ok == true'
test "$(mysql -h 127.0.0.1 -uroot -ptestpassword -N -s english_power_quest -e "SELECT xp_total FROM players WHERE player_id=$player_id")" = 20

# Simulate browser close: use ONLY the long-lived guest cookie; no PHPSESSID.
token=$(awk '$6 == "epq_guest_resume" { print $7 }' "$cookies")
test -n "$token"
resumed=$(curl -fsS -H "Cookie: epq_guest_resume=$token" "$base/index.php")
printf '%s' "$resumed" | grep -q 'SmokeHero'

upgrade=$(curl -fsS -b "$cookies" -c "$cookies" "$base/register.php")
csrf=$(printf '%s' "$upgrade" | grep -oP 'name="csrf_token" value="\K[a-f0-9]{64}' | head -n1)
curl -fsS -D /tmp/epq_up_headers.txt -o /tmp/epq_up_post.html -b "$cookies" -c "$cookies" \
  --data-urlencode "csrf_token=$csrf" --data-urlencode 'username=smoke_hero' \
  --data-urlencode 'display_name=SmokeHero' --data-urlencode 'email=smoke@example.com' \
  --data-urlencode 'password=Passw0rd-Test!' --data-urlencode 'confirm_password=Passw0rd-Test!' \
  "$base/register.php"
grep -q 'Location: /FYP/index.php' /tmp/epq_up_headers.txt

check=$(mysql -h 127.0.0.1 -uroot -ptestpassword -N -s english_power_quest \
  -e "SELECT CONCAT(u.account_type,':',u.email,':',p.player_id,':',p.xp_total,':',p.story_intro_seen) FROM users u JOIN players p ON p.user_id=u.user_id WHERE u.user_id=$user_id")
test "$check" = "password:smoke@example.com:$player_id:20:1"
tokens=$(mysql -h 127.0.0.1 -uroot -ptestpassword -N -s english_power_quest -e "SELECT COUNT(*) FROM guest_login_tokens WHERE user_id=$user_id")
test "$tokens" = 0
# Upgraded player can no longer use the old anonymous bearer cookie.
blocked=$(curl -sS -o /dev/null -w '%{http_code}' -H "Cookie: epq_guest_resume=$token" "$base/index.php")
test "$blocked" = 302

state_after_upgrade=$(curl -fsS -b "$cookies" "$base/api/game_state.php")
printf '%s' "$state_after_upgrade" | jq -e '.state.currentRealmId == "forest" and .state.questStep == 2'

# Account conversion regenerates the PHP session and CSRF token.
upgraded_page=$(curl -fsS -b "$cookies" -c "$cookies" "$base/index.php")
csrf=$(printf '%s' "$upgraded_page" | grep -oP 'name="csrf_token" value="\\K[a-f0-9]{64}' | head -n1)

# A legitimate shop purchase must *deduct* coins, never silently clamp it to 0.
shop=$(curl -fsS -b "$cookies" -H 'Content-Type: application/json' \
  -d "{\"csrfToken\":\"$csrf\",\"coinDelta\":-5,\"sourceType\":\"SHOP_PURCHASE\"}" \
  "$base/api/save_progress.php")
printf '%s' "$shop" | jq -e '.ok == true'
test "$(mysql -h 127.0.0.1 -uroot -ptestpassword -N -s english_power_quest -e "SELECT coins_total FROM players WHERE player_id=$player_id")" = 5

# Unauthorized state changes without CSRF are blocked.
no_csrf=$(curl -sS -o /dev/null -w '%{http_code}' -b "$cookies" -H 'Content-Type: application/json' \
  -d '{"state":{"currentRealmId":"ruins"}}' "$base/api/game_state.php")
test "$no_csrf" = 403

# Logout, then password-login to the SAME converted account.
new_map=$(curl -fsS -b "$cookies" -c "$cookies" "$base/index.php")
csrf=$(printf '%s' "$new_map" | grep -oP 'name="csrf_token" value="\K[a-f0-9]{64}' | head -n1)
logout_status=$(curl -sS -o /dev/null -w '%{http_code}' -b "$cookies" -c "$cookies" \
  --data-urlencode "csrf_token=$csrf" "$base/logout.php")
test "$logout_status" = 302
new_login=$(curl -fsS -c "$cookies" -b "$cookies" "$base/login.php")
csrf=$(printf '%s' "$new_login" | grep -oP 'name="csrf_token" value="\K[a-f0-9]{64}' | head -n1)
curl -fsS -D /tmp/epq_login_headers.txt -o /tmp/epq_login_post.html -b "$cookies" -c "$cookies" \
  --data-urlencode "csrf_token=$csrf" --data-urlencode 'username=smoke_hero' \
  --data-urlencode 'password=Passw0rd-Test!' "$base/login.php"
grep -q 'Location: /FYP/index.php' /tmp/epq_login_headers.txt
logged_in=$(curl -fsS -b "$cookies" "$base/api/player.php")
printf '%s' "$logged_in" | jq -e --argjson pid "$player_id" '.ok == true and .player.playerId == $pid and .player.xp == 20 and .player.coins == 5'

echo "PASS: guest, story, map, XP, CSRF, browser recovery, account upgrade and password login"
