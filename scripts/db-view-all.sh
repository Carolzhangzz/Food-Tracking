#!/bin/bash
# 📊 查看数据库所有数据的完整脚本

echo "📊 ================================"
echo "   Food-Tracking 数据库查询报告"
echo "   ================================"
echo ""

echo "1️⃣ 允许的玩家ID列表（已使用 / 未使用）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
heroku pg:psql --app foodtracking-t1 -c "
SELECT 
  \"playerId\" as \"玩家ID\",
  CASE WHEN used THEN '✅ 已使用' ELSE '⭕️ 未使用' END as \"状态\",
  TO_CHAR(\"createdAt\", 'YYYY-MM-DD') as \"创建日期\",
  TO_CHAR(\"updatedAt\", 'YYYY-MM-DD HH24:MI') as \"最后更新\"
FROM allowed_ids 
ORDER BY \"playerId\";
"

echo ""
echo "2️⃣ 所有玩家基本信息"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
heroku pg:psql --app foodtracking-t1 -c "
SELECT 
  \"playerId\" as \"玩家ID\",
  \"currentDay\" as \"当前天数\",
  CASE WHEN \"gameCompleted\" THEN '✅' ELSE '⏳' END as \"完成\",
  \"language\" as \"语言\",
  TO_CHAR(\"firstLoginDate\", 'YYYY-MM-DD HH24:MI') as \"首次登录\"
FROM \"Players\" 
ORDER BY \"firstLoginDate\" DESC;
"

echo ""
echo "3️⃣ 玩家餐食记录统计"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
heroku pg:psql --app foodtracking-t1 -c "
SELECT 
  \"playerId\" as \"玩家ID\",
  COUNT(*) as \"餐食总数\",
  COUNT(DISTINCT \"day\") as \"记录天数\",
  COUNT(CASE WHEN \"mealType\"='breakfast' THEN 1 END) as \"早餐\",
  COUNT(CASE WHEN \"mealType\"='lunch' THEN 1 END) as \"午餐\",
  COUNT(CASE WHEN \"mealType\"='dinner' THEN 1 END) as \"晚餐\"
FROM \"MealRecords\" 
GROUP BY \"playerId\" 
ORDER BY COUNT(*) DESC;
"

echo ""
echo "4️⃣ 玩家进度详情（NPC解锁情况）"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
heroku pg:psql --app foodtracking-t1 -c "
SELECT 
  player_id as \"玩家ID\",
  day as \"天数\",
  npc_id as \"NPC ID\",
  meals_recorded as \"已记录餐食\",
  CASE WHEN intro_watched THEN '✅' ELSE '⭕️' END as \"开场白\"
FROM \"PlayerProgresses\" 
ORDER BY player_id, day;
"

echo ""
echo "5️⃣ 最近20条餐食记录"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
heroku pg:psql --app foodtracking-t1 -c "
SELECT 
  \"playerId\" as \"玩家\",
  \"day\" as \"天\",
  \"mealType\" as \"餐次\",
  LEFT(\"npcName\", 15) as \"NPC\",
  TO_CHAR(\"createdAt\", 'MM-DD HH24:MI') as \"记录时间\"
FROM \"MealRecords\" 
ORDER BY \"createdAt\" DESC 
LIMIT 20;
"

echo ""
echo "6️⃣ 数据库统计总览"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
heroku pg:psql --app foodtracking-t1 -c "
SELECT 
  '允许的ID总数' as \"项目\", COUNT(*)::text as \"数量\" FROM allowed_ids
UNION ALL
SELECT 
  '已使用的ID', COUNT(*)::text FROM allowed_ids WHERE used = true
UNION ALL
SELECT 
  '玩家总数', COUNT(*)::text FROM \"Players\"
UNION ALL
SELECT 
  '餐食记录总数', COUNT(*)::text FROM \"MealRecords\"
UNION ALL
SELECT 
  '进度记录总数', COUNT(*)::text FROM \"PlayerProgresses\"
UNION ALL
SELECT 
  '线索总数', COUNT(*)::text FROM \"Clues\";
"

echo ""
echo "✅ 查询完成！"
echo ""

