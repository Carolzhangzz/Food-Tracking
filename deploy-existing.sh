#!/bin/bash
# 使用现有 Heroku 应用部署脚本

echo "🔄 使用现有应用 foodtracking-t1 部署..."
echo ""

cd /Users/carol/Documents/2025summer/rpg_new/Food-Tracking

# 1. 添加现有应用的 remote
echo "📡 连接到现有应用..."
heroku git:remote -a foodtracking-t1

# 2. 检查当前环境变量
echo ""
echo "🔍 当前环境变量："
heroku config

# 3. 设置/更新环境变量（如果需要）
echo ""
echo "⚙️ 是否需要更新环境变量？"
read -p "更新 GEMINI_API_KEY? (y/n): " update_gemini
if [[ $update_gemini =~ ^[Yy]$ ]]; then
  read -p "输入 Gemini API Key: " gemini_key
  heroku config:set GEMINI_API_KEY=$gemini_key
fi

read -p "更新 CONVAI_API_KEY? (y/n): " update_convai
if [[ $update_convai =~ ^[Yy]$ ]]; then
  read -p "输入 ConvAI API Key: " convai_key
  heroku config:set CONVAI_API_KEY=$convai_key
fi

# 4. 确认部署
echo ""
echo "📦 准备部署最新代码..."
git status

read -p "确认部署到 foodtracking-t1? (y/n): " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
  echo "❌ 取消部署"
  exit 1
fi

# 5. 构建并部署
echo ""
echo "🔨 构建项目..."
npm run build

echo ""
echo "📤 提交代码..."
git add .
git commit -m "Update to latest version" || echo "没有新的更改"

echo ""
echo "🚀 部署到 Heroku..."
git push heroku main

# 6. 可选：重新初始化数据库
echo ""
read -p "是否需要重新初始化数据库（会清空现有数据）? (y/n): " reset_db
if [[ $reset_db =~ ^[Yy]$ ]]; then
  echo "🗄️ 重新初始化数据库..."
  heroku run node server/scripts/initDatabase.js
  
  echo "🆔 创建玩家 ID..."
  heroku run node server/scripts/assignPlayerId.js create 50
fi

echo ""
echo "✅ 部署完成！"
echo ""
echo "🌐 打开应用..."
heroku open

echo ""
echo "📊 查看日志..."
heroku logs --tail

