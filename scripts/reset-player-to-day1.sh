#!/bin/bash

# 重置玩家到 Day 1
# 用法: ./reset-player-to-day1.sh <playerId>

if [ -z "$1" ]; then
  echo "❌ 请提供玩家ID！"
  echo ""
  echo "用法："
  echo "  ./reset-player-to-day1.sh <playerId>"
  echo ""
  echo "示例："
  echo "  ./reset-player-to-day1.sh 026"
  exit 1
fi

PLAYER_ID="$1"

echo ""
echo "🔄 ================================"
echo "   重置玩家 $PLAYER_ID 到 Day 1"
echo "   ================================"
echo ""

# 显示当前状态
echo "📊 当前状态："
heroku pg:psql --app foodtracking-t1 --command "
SELECT player_id AS \"玩家ID\", 
       current_day AS \"当前天数\", 
       TO_CHAR(first_login_date, 'YYYY-MM-DD HH24:MI') AS \"首次登录\",
       game_completed AS \"游戏完成\"
FROM \"Players\" 
WHERE player_id = '$PLAYER_ID';
"

echo ""
echo "⚠️  警告：即将删除该玩家的所有游戏数据（餐食记录、线索、对话历史、进度）"
echo "    并重置到 Day 1。首次登录时间将保持不变。"
echo ""
read -p "确认继续？(y/N): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo ""
  echo "❌ 已取消操作"
  exit 0
fi

echo ""
echo "🔄 正在执行重置..."
echo ""

# 执行重置 SQL
heroku pg:psql --app foodtracking-t1 --command "
BEGIN;

-- 1. 删除餐食记录
DELETE FROM \"MealRecords\" WHERE player_id = '$PLAYER_ID';

-- 2. 删除线索记录
DELETE FROM \"Clues\" WHERE player_id = '$PLAYER_ID';

-- 3. 删除对话历史
DELETE FROM \"ConversationHistories\" WHERE player_id = '$PLAYER_ID';

-- 4. 删除 Day 2-7 的进度记录
DELETE FROM \"PlayerProgresses\" WHERE player_id = '$PLAYER_ID' AND day > 1;

-- 5. 重置 Day 1 的 intro 状态
UPDATE \"PlayerProgresses\" 
SET intro_watched = false 
WHERE player_id = '$PLAYER_ID' AND day = 1;

-- 6. 重置玩家到 Day 1
UPDATE \"Players\" 
SET current_day = 1, game_completed = false 
WHERE player_id = '$PLAYER_ID';

COMMIT;
"

echo ""
echo "📊 重置后状态："
heroku pg:psql --app foodtracking-t1 --command "
SELECT player_id AS \"玩家ID\", 
       current_day AS \"当前天数\", 
       TO_CHAR(first_login_date, 'YYYY-MM-DD HH24:MI') AS \"首次登录\",
       game_completed AS \"游戏完成\"
FROM \"Players\" 
WHERE player_id = '$PLAYER_ID';
"

echo ""
echo "✅ 玩家 $PLAYER_ID 已成功重置到 Day 1！"
echo ""
echo "📝 注意事项："
echo "   1. 玩家需要清除浏览器缓存或使用无痕模式重新登录"
echo "   2. 首次登录时间保持不变，天数计算仍基于原始登录时间"
echo "   3. 建议玩家在浏览器开发者工具中清除 localStorage"
echo ""
