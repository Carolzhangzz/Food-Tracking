#!/bin/bash
# 🔍 查看特定玩家的完整记录

# 使用方法：
# ./scripts/db-view-player.sh 021

if [ $# -eq 0 ]; then
  echo "❌ 错误：请提供玩家ID"
  echo ""
  echo "使用方法："
  echo "  ./scripts/db-view-player.sh 021"
  echo ""
  exit 1
fi

PLAYER_ID=$1

echo "================================"
echo "🔍 玩家 $PLAYER_ID 的完整记录"
echo "================================"
echo ""

echo "1️⃣ ID状态"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
heroku pg:psql --app foodtracking-t1 -c "
SELECT 
  \"playerId\" as \"玩家ID\",
  CASE WHEN used THEN '✅ 已使用' ELSE '⭕️ 未使用' END as \"状态\",
  TO_CHAR(\"createdAt\", 'YYYY-MM-DD HH24:MI:SS') as \"创建时间\",
  TO_CHAR(\"updatedAt\", 'YYYY-MM-DD HH24:MI:SS') as \"最后更新\"
FROM allowed_ids 
WHERE \"playerId\" = '$PLAYER_ID';
"

echo ""
echo "2️⃣ 玩家基本信息"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
heroku pg:psql --app foodtracking-t1 -c "
SELECT 
  \"playerId\" as \"玩家ID\",
  \"currentDay\" as \"当前天数\",
  CASE WHEN \"gameCompleted\" THEN '✅ 已完成' ELSE '⏳ 进行中' END as \"游戏状态\",
  \"language\" as \"语言\",
  TO_CHAR(\"firstLoginDate\", 'YYYY-MM-DD HH24:MI:SS') as \"首次登录\"
FROM \"Players\" 
WHERE \"playerId\" = '$PLAYER_ID';
"

echo ""
echo "3️⃣ 玩家进度（NPC解锁情况）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
heroku pg:psql --app foodtracking-t1 -c "
SELECT 
  player_id as \"玩家ID\",
  day as \"天数\",
  npc_id as \"NPC\",
  meals_recorded as \"已记录餐食\",
  CASE WHEN intro_watched THEN '✅' ELSE '⭕️' END as \"开场白\",
  TO_CHAR(unlocked_at, 'MM-DD HH24:MI') as \"解锁时间\"
FROM \"PlayerProgresses\" 
WHERE player_id = '$PLAYER_ID'
ORDER BY day;
"

echo ""
echo "4️⃣ 餐食记录详情（简要）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
heroku pg:psql --app foodtracking-t1 -c "
SELECT 
  \"day\" as \"天数\",
  \"mealType\" as \"餐次\",
  \"npcName\" as \"NPC\",
  TO_CHAR(\"createdAt\", 'MM-DD HH24:MI') as \"记录时间\"
FROM \"MealRecords\" 
WHERE \"playerId\" = '$PLAYER_ID'
ORDER BY \"day\", \"createdAt\";
"

echo ""
echo "4️⃣-详细 餐食完整内容（每一餐的详细回答）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 查询每一餐的详细信息
heroku pg:psql --app foodtracking-t1 -c "
SELECT 
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' as \"分隔线\",
  ('📅 Day ' || \"day\" || ' - ' || \"mealType\" || ' (' || \"npcName\" || ')') as \"餐次信息\",
  ('⏰ ' || TO_CHAR(\"createdAt\", 'YYYY-MM-DD HH24:MI')) as \"记录时间\",
  '' as \"空行1\",
  '🍽️ 详细回答：' as \"标题\",
  ('Q1 (获得方式): ' || COALESCE(\"mealAnswers\"->>'Q1', '未回答')) as \"Q1\",
  ('Q2 (用餐时间): ' || COALESCE(\"mealAnswers\"->>'Q2', '未回答')) as \"Q2\",
  ('Q3 (用餐时长): ' || COALESCE(\"mealAnswers\"->>'Q3', '未回答')) as \"Q3\",
  ('Q4 (吃了什么): ' || COALESCE(\"mealAnswers\"->>'Q4', '未回答')) as \"Q4\",
  ('Q5 (份量大小): ' || COALESCE(\"mealAnswers\"->>'Q5', '未回答')) as \"Q5\",
  ('Q6 (份量决定): ' || COALESCE(\"mealAnswers\"->>'Q6', '未回答')) as \"Q6\",
  ('Q7 (身体感觉): ' || COALESCE(\"mealAnswers\"->>'Q7', '未回答')) as \"Q7\",
  ('Q8 (选择原因): ' || COALESCE(\"mealAnswers\"->>'Q8', '未回答')) as \"Q8\",
  CASE 
    WHEN \"mealAnswers\"->>'Q_TIME_FOLLOWUP' IS NOT NULL 
    THEN ('💡 时间追问: ' || (\"mealAnswers\"->>'Q_TIME_FOLLOWUP'))
    ELSE ''
  END as \"Q_TIME\"
FROM \"MealRecords\" 
WHERE \"playerId\" = '$PLAYER_ID'
ORDER BY \"day\", \"createdAt\";
" | sed 's/^│//; s/│$//'

echo ""
echo "5️⃣ 餐食统计"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
heroku pg:psql --app foodtracking-t1 -c "
SELECT 
  COUNT(*) as \"总餐食数\",
  COUNT(DISTINCT \"day\") as \"记录天数\",
  COUNT(CASE WHEN \"mealType\"='breakfast' THEN 1 END) as \"早餐\",
  COUNT(CASE WHEN \"mealType\"='lunch' THEN 1 END) as \"午餐\",
  COUNT(CASE WHEN \"mealType\"='dinner' THEN 1 END) as \"晚餐\"
FROM \"MealRecords\" 
WHERE \"playerId\" = '$PLAYER_ID';
"

echo ""
echo "6️⃣ 线索记录"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
heroku pg:psql --app foodtracking-t1 -c "
SELECT 
  \"npcId\" as \"NPC\",
  \"clueType\" as \"线索类型\",
  LEFT(\"clueText\", 40) as \"线索内容\",
  TO_CHAR(\"receivedAt\", 'MM-DD HH24:MI') as \"获得时间\"
FROM \"Clues\" 
WHERE \"playerId\" = '$PLAYER_ID'
ORDER BY \"receivedAt\";
"

echo ""
echo "✅ 查询完成"
echo ""

