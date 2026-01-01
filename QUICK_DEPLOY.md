# 🚀 快速部署指南（5分钟搞定！）

## 🎯 目标
将游戏部署到 Heroku，获得一个可以分享的链接。

---

## ✅ 准备工作（5分钟）

### 1. 注册 Heroku 账号
- 访问 https://www.heroku.com/
- 点击 "Sign up for free"
- 验证邮箱

### 2. 安装 Heroku CLI

**macOS**:
```bash
brew tap heroku/brew && brew install heroku
```

**Windows**: 下载安装包
- https://devcenter.heroku.com/articles/heroku-cli

### 3. 准备 API Keys

#### Gemini API Key (免费)
1. 访问 https://aistudio.google.com/
2. 点击 "Get API Key"
3. 复制 API Key

#### ConvAI API Key (免费)
1. 访问 https://convai.com/
2. 注册并登录
3. 进入 Dashboard → API Keys
4. 创建并复制 API Key

---

## 🚀 部署步骤（10分钟）

### Step 1: 登录 Heroku
```bash
cd /Users/carol/Documents/2025summer/rpg_new/Food-Tracking
heroku login
```
按任意键，会打开浏览器登录。

### Step 2: 创建应用
```bash
# 创建应用（名字必须唯一）
heroku create gourmet-village-game-2025

# 或者让 Heroku 自动生成名字
heroku create
```

记下你的应用名字！会是类似 `gourmet-village-game-2025` 或 `mysterious-reef-12345`。

### Step 3: 添加数据库
```bash
heroku addons:create heroku-postgresql:essential-0
```

等待几秒，数据库创建完成。

### Step 4: 设置环境变量
```bash
# 设置 Gemini API Key（替换为你的）
heroku config:set GEMINI_API_KEY=AIzaSy...你的key

# 设置 ConvAI API Key（替换为你的）
heroku config:set CONVAI_API_KEY=你的key

# 生成并设置会话密钥
heroku config:set SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# 设置生产环境
heroku config:set NODE_ENV=production
```

### Step 5: 部署！
```bash
# 确保代码已提交
git add .
git commit -m "Ready for deployment"

# 推送到 Heroku
git push heroku main

# 如果你的分支是 master
git push heroku master
```

等待 2-3 分钟，Heroku 会自动构建和部署。

### Step 6: 初始化数据库
```bash
heroku run node server/scripts/initDatabase.js
```

### Step 7: 创建玩家 ID
```bash
# 创建 50 个玩家 ID（001-050）
heroku run node server/scripts/assignPlayerId.js create 50
```

### Step 8: 打开游戏！
```bash
heroku open
```

你的游戏链接会是：
```
https://gourmet-village-game-2025.herokuapp.com
```

---

## 🎮 测试游戏

1. 打开游戏链接
2. 输入 `001` 作为玩家 ID
3. 选择语言和性别
4. 开始游戏！

---

## 👥 分配玩家 ID

### 查看可用 ID
```bash
heroku run node server/scripts/assignPlayerId.js list
```

### 分配 ID 给玩家
```bash
heroku run node server/scripts/assignPlayerId.js assign "张三" "zhang@email.com"
```

会输出：
```
✅ ID 分配成功！
━━━━━━━━━━━━━━━━━━━━━━━━
🆔 玩家 ID: 001
👤 姓名: 张三
📧 邮箱: zhang@email.com
```

---

## 📧 给玩家发送邮件模板

```
主题: 欢迎来到《美食村之旅》- 你的游戏 ID

亲爱的 [玩家姓名]，

欢迎来到《美食村之旅》！这是一个为期7天的互动式饮食记录游戏。

🆔 你的专属玩家 ID: XXX
🎮 游戏链接: https://你的应用名.herokuapp.com

📝 如何开始游戏：
1. 点击上方链接打开游戏
2. 输入你的玩家 ID（XXX）
3. 选择语言（中文/English）
4. 选择角色性别
5. 观看开场动画
6. 开始你的美食之旅！

🎯 游戏规则：
- 每天记录三餐（早餐、午餐、晚餐）
- 与村民对话，记录饮食细节
- 收集线索，了解消失的大厨
- 7天后获得个性化饮食报告

💡 温馨提示：
- 建议在电脑上游玩（手机也支持）
- 每天只需10-15分钟
- 诚实记录，报告更准确
- 可以随时切换中英文

❓ 遇到问题？
回复此邮件或联系：your-email@example.com

祝游戏愉快！🍜✨

游戏团队
```

---

## 🔧 常用命令

### 查看日志
```bash
heroku logs --tail
```

### 重启应用
```bash
heroku restart
```

### 查看数据库
```bash
heroku pg:psql
\dt                    # 查看所有表
SELECT * FROM "Players" LIMIT 5;
```

### 更新游戏
```bash
# 修改代码后
npm run build
git add .
git commit -m "Update game"
git push heroku main

# Heroku 会自动重新部署
```

### 查看应用信息
```bash
heroku info
```

### 查看环境变量
```bash
heroku config
```

---

## 🎉 完成！

你的游戏已经部署成功！现在你可以：

1. ✅ 分享链接给玩家
2. ✅ 分配玩家 ID
3. ✅ 监控应用状态
4. ✅ 收集游戏数据

**游戏链接**: `https://你的应用名.herokuapp.com`

---

## 💰 费用说明

Heroku 免费套餐包括：
- ✅ 1000 小时/月运行时间（足够24/7运行）
- ✅ 免费 PostgreSQL 数据库（1万行）
- ✅ 自动 SSL 证书
- ✅ 自定义域名支持

如果需要升级：
- 💎 Eco Plan: $5/月（不休眠、更多资源）
- 💎 Basic Plan: $7/月（更多内存）

---

## 📞 需要帮助？

查看完整文档: `DEPLOYMENT_GUIDE.md`

常见问题:
- 游戏空白？→ 检查 `package.json` 中的 `homepage` 字段
- API 错误？→ 检查环境变量是否设置正确
- 数据库错误？→ 确保运行了 `initDatabase.js`

祝部署顺利！🚀

