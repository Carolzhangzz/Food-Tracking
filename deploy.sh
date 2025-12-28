#!/bin/bash

# 🚀 快速部署脚本
# 用法: ./deploy.sh [platform]
# 平台: heroku, render, 或不填（自动检测）

echo "🚀 开始部署游戏..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. 检查是否有未提交的更改
if [[ -n $(git status -s) ]]; then
  echo -e "${YELLOW}⚠️  检测到未提交的更改${NC}"
  git status -s
  echo ""
  read -p "是否要提交这些更改？(y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "输入提交信息: " commit_msg
    git add .
    git commit -m "$commit_msg"
    echo -e "${GREEN}✅ 更改已提交${NC}"
  else
    echo -e "${RED}❌ 取消部署${NC}"
    exit 1
  fi
fi

# 2. 运行测试
echo ""
echo "🧪 运行测试..."
npm test -- --watchAll=false --passWithNoTests
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ 测试失败，取消部署${NC}"
  exit 1
fi
echo -e "${GREEN}✅ 测试通过${NC}"

# 3. 构建项目
echo ""
echo "🔨 构建项目..."
npm run build
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ 构建失败${NC}"
  exit 1
fi
echo -e "${GREEN}✅ 构建成功${NC}"

# 4. 部署到平台
PLATFORM=${1:-auto}

if [ "$PLATFORM" = "heroku" ] || ([ "$PLATFORM" = "auto" ] && git remote | grep -q "heroku"); then
  echo ""
  echo "📦 部署到 Heroku..."
  
  # 检查是否登录
  heroku auth:whoami > /dev/null 2>&1
  if [ $? -ne 0 ]; then
    echo -e "${YELLOW}请先登录 Heroku...${NC}"
    heroku login
  fi
  
  # 推送到 Heroku
  git push heroku main || git push heroku master
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 部署成功！${NC}"
    echo ""
    echo "🌐 打开应用..."
    heroku open
    
    echo ""
    echo "📊 查看日志..."
    heroku logs --tail --num 50
  else
    echo -e "${RED}❌ 部署失败${NC}"
    exit 1
  fi
  
elif [ "$PLATFORM" = "render" ]; then
  echo ""
  echo "📦 部署到 Render..."
  echo "正在推送到 GitHub..."
  
  git push origin main || git push origin master
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 代码已推送到 GitHub${NC}"
    echo -e "${YELLOW}请在 Render Dashboard 查看自动部署状态${NC}"
    echo "🌐 https://dashboard.render.com/"
  else
    echo -e "${RED}❌ 推送失败${NC}"
    exit 1
  fi
  
else
  echo -e "${YELLOW}⚠️  未检测到部署平台${NC}"
  echo ""
  echo "请选择部署方式:"
  echo "1. Heroku"
  echo "2. Render (通过 GitHub)"
  echo "3. 手动部署"
  read -p "选择 (1-3): " -n 1 -r
  echo
  
  case $REPLY in
    1)
      echo "运行: ./deploy.sh heroku"
      ./deploy.sh heroku
      ;;
    2)
      echo "运行: ./deploy.sh render"
      ./deploy.sh render
      ;;
    3)
      echo ""
      echo "📖 手动部署步骤:"
      echo "1. 确保已运行 npm run build"
      echo "2. 将 build/ 文件夹和 server/ 文件夹上传到服务器"
      echo "3. 在服务器上运行 npm install"
      echo "4. 设置环境变量"
      echo "5. 运行 npm start"
      ;;
    *)
      echo -e "${RED}❌ 无效选择${NC}"
      exit 1
      ;;
  esac
fi

echo ""
echo -e "${GREEN}🎉 部署流程完成！${NC}"

