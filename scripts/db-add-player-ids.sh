#!/bin/bash
# 🆕 新增玩家ID的脚本

# 使用方法：
# ./scripts/db-add-player-ids.sh 021 022 023 024 025
# 或者
# ./scripts/db-add-player-ids.sh 021-030 (自动生成021到030)

echo "🆕 ================================"
echo "   新增玩家ID到数据库"
echo "   ================================"
echo ""

# 检查参数
if [ $# -eq 0 ]; then
  echo "❌ 错误：请提供要新增的玩家ID"
  echo ""
  echo "使用方法："
  echo "  ./scripts/db-add-player-ids.sh 021 022 023"
  echo "  或者"
  echo "  ./scripts/db-add-player-ids.sh 021-030  (批量生成)"
  echo ""
  exit 1
fi

# 处理批量ID（如 021-030）
if [[ $1 =~ ^([0-9]+)-([0-9]+)$ ]]; then
  START=${BASH_REMATCH[1]}
  END=${BASH_REMATCH[2]}
  
  echo "📋 批量生成ID: $START 到 $END"
  echo ""
  
  IDS=()
  for i in $(seq $START $END); do
    IDS+=("$(printf "%03d" $i)")
  done
else
  # 单个或多个ID
  IDS=("$@")
fi

echo "📝 准备新增的ID: ${IDS[@]}"
echo ""

# 构建SQL语句
SQL="INSERT INTO allowed_ids (\"playerId\", used, \"createdAt\", \"updatedAt\") VALUES "
VALUES=()

for ID in "${IDS[@]}"; do
  VALUES+=("('$ID', false, NOW(), NOW())")
done

# 用逗号连接所有values
SQL="$SQL $(IFS=, ; echo "${VALUES[*]}")"
SQL="$SQL ON CONFLICT DO NOTHING;"

echo "🔄 正在执行SQL..."
echo ""

# 执行SQL
heroku pg:psql --app foodtracking-t1 -c "$SQL"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ 成功新增玩家ID！"
  echo ""
  echo "📊 当前所有ID列表："
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  heroku pg:psql --app foodtracking-t1 -c "
  SELECT 
    \"playerId\" as \"玩家ID\",
    CASE WHEN used THEN '✅ 已使用' ELSE '⭕️ 未使用' END as \"状态\",
    TO_CHAR(\"createdAt\", 'YYYY-MM-DD HH24:MI') as \"创建时间\"
  FROM allowed_ids 
  ORDER BY \"playerId\" DESC 
  LIMIT 20;
  "
else
  echo ""
  echo "❌ 新增失败，请检查错误信息"
  exit 1
fi

echo ""
echo "✅ 完成！"
echo ""

