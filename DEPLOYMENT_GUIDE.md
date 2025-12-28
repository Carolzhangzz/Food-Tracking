# 🚀 游戏部署完整指南

## 📋 目录
1. [部署前准备](#部署前准备)
2. [推荐部署方案](#推荐部署方案)
3. [Heroku 部署（推荐）](#heroku-部署推荐)
4. [Render.com 部署（免费替代）](#rendercom-部署免费替代)
5. [环境变量配置](#环境变量配置)
6. [玩家 ID 管理](#玩家-id-管理)
7. [部署后测试](#部署后测试)
8. [常见问题](#常见问题)

---

## 部署前准备

### 1. 确保项目可以本地运行
```bash
# 在项目根目录
npm install
npm run build
npm start

# 测试访问
open http://localhost:3001
```

### 2. 检查必需文件
- ✅ `package.json` - 已配置 `start` 和 `build` 脚本
- ✅ `Procfile` - 需要创建（见下文）
- ✅ `.env` - 环境变量（不会上传到 Git）
- ✅ `build/` 文件夹 - React 打包后的静态文件

### 3. 创建 Procfile（Heroku 需要）
在项目根目录创建名为 `Procfile` 的文件（无扩展名）：

```
web: npm start
```

---

## 推荐部署方案

### 方案对比

| 平台 | 优点 | 缺点 | 成本 | 推荐度 |
|------|------|------|------|--------|
| **Heroku** | 简单、稳定、PostgreSQL 免费 | 需绑卡（但有免费额度） | $0-$7/月 | ⭐⭐⭐⭐⭐ |
| **Render.com** | 完全免费、无需绑卡 | 数据库有限制、冷启动慢 | $0 | ⭐⭐⭐⭐ |
| **Railway** | 现代化、易用 | 免费额度少 | $5/月起 | ⭐⭐⭐ |
| **Vercel** | 前端快、免费 | 后端支持有限 | $0（仅前端） | ⭐⭐ |

**最佳选择：Heroku**（有数据库、易管理、学生可能有优惠）

---

## Heroku 部署（推荐）

### 步骤 1: 安装 Heroku CLI

**macOS**:
```bash
brew tap heroku/brew && brew install heroku
```

**Windows**: 下载安装包
- https://devcenter.heroku.com/articles/heroku-cli

### 步骤 2: 登录 Heroku
```bash
heroku login
```

### 步骤 3: 创建 Heroku 应用
```bash
cd /Users/carol/Documents/2025summer/rpg_new/Food-Tracking

# 创建新应用（名字要唯一，如 gourmet-village-game）
heroku create gourmet-village-game

# 或者让 Heroku 自动生成名字
heroku create
```

### 步骤 4: 添加 PostgreSQL 数据库
```bash
# 添加免费的 Heroku Postgres
heroku addons:create heroku-postgresql:essential-0

# 查看数据库连接信息
heroku config:get DATABASE_URL
```

### 步骤 5: 配置环境变量
```bash
# 设置必需的环境变量
heroku config:set NODE_ENV=production
heroku config:set GEMINI_API_KEY=你的_Gemini_API_Key
heroku config:set CONVAI_API_KEY=你的_ConvAI_API_Key
heroku config:set SESSION_SECRET=随机生成的长字符串

# 查看所有环境变量
heroku config
```

### 步骤 6: 初始化 Git（如果还没有）
```bash
# 如果还没有 Git 仓库
git init
git add .
git commit -m "Initial commit for deployment"
```

### 步骤 7: 部署到 Heroku
```bash
# 推送到 Heroku
git push heroku main

# 如果你的主分支叫 master
git push heroku master

# 查看部署日志
heroku logs --tail
```

### 步骤 8: 初始化数据库
```bash
# 运行数据库初始化脚本
heroku run node server/scripts/initDatabase.js

# 或者直接在 Heroku Postgres 中执行 SQL
heroku pg:psql
```

### 步骤 9: 打开你的游戏
```bash
heroku open
```

你的游戏链接会是：`https://gourmet-village-game.herokuapp.com`

---

## Render.com 部署（免费替代）

### 步骤 1: 准备 Git 仓库
```bash
# 确保代码在 GitHub 上
git remote add origin https://github.com/你的用户名/gourmet-village.git
git push -u origin main
```

### 步骤 2: 在 Render.com 创建账号
- 访问 https://render.com
- 用 GitHub 账号登录

### 步骤 3: 创建新的 Web Service
1. 点击 "New +" → "Web Service"
2. 连接你的 GitHub 仓库
3. 配置：
   - **Name**: gourmet-village-game
   - **Region**: Singapore (最快)
   - **Branch**: main
   - **Root Directory**: 留空
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free

### 步骤 4: 添加环境变量
在 "Environment" 标签添加：
```
NODE_ENV=production
GEMINI_API_KEY=你的key
CONVAI_API_KEY=你的key
PORT=3001
```

### 步骤 5: 添加 PostgreSQL 数据库
1. 点击 "New +" → "PostgreSQL"
2. 选择 Free 计划
3. 记录 "Internal Database URL"

### 步骤 6: 连接数据库到 Web Service
在 Web Service 的环境变量中添加：
```
DATABASE_URL=你的_Postgres_Internal_URL
```

### 步骤 7: 部署
点击 "Create Web Service"，Render 会自动部署。

你的游戏链接：`https://gourmet-village-game.onrender.com`

---

## 环境变量配置

### 必需的环境变量

创建 `.env` 文件（本地测试用，不上传到 Git）：

```bash
# 数据库配置（部署时由 Heroku/Render 自动提供）
DATABASE_URL=postgresql://localhost:5432/food_tracking_db

# API Keys（需要自己获取）
GEMINI_API_KEY=AIzaSy...你的key
CONVAI_API_KEY=你的ConvAI_key

# 会话密钥（随机生成）
SESSION_SECRET=随机长字符串至少32位

# 环境
NODE_ENV=production

# 端口（部署平台会自动设置）
PORT=3001
```

### 如何获取 API Keys

#### 1. Gemini API Key
1. 访问 https://aistudio.google.com/
2. 点击 "Get API Key"
3. 创建新项目或选择现有项目
4. 复制 API Key

#### 2. ConvAI API Key
1. 访问 https://convai.com/
2. 注册账号
3. 进入 Dashboard → API Keys
4. 创建新 API Key

---

## 玩家 ID 管理

### 方案 1: 预分配 ID（推荐）

在数据库中预先创建玩家 ID：

```bash
# 连接到你的数据库（Heroku）
heroku pg:psql

# 或者（Render）
psql -h postgres-url -U username -d database_name
```

```sql
-- 创建允许的玩家 ID 表
CREATE TABLE IF NOT EXISTS "AllowedIds" (
  "playerId" VARCHAR(10) PRIMARY KEY,
  "used" BOOLEAN DEFAULT FALSE,
  "assignedTo" VARCHAR(255),
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- 批量插入玩家 ID（示例：001-050）
INSERT INTO "AllowedIds" ("playerId") 
SELECT LPAD(generate_series(1, 50)::text, 3, '0');

-- 查看所有可用 ID
SELECT * FROM "AllowedIds" WHERE "used" = FALSE;
```

### 方案 2: 动态生成 ID

修改 `server/routes/gameRoutes.js` 的登录逻辑：

```javascript
// 在登录时自动创建新 ID
router.post("/login", async (req, res) => {
  let { playerId } = req.body;
  
  // 如果 playerId 为空，自动生成
  if (!playerId) {
    const lastPlayer = await Player.findOne({
      order: [['playerId', 'DESC']]
    });
    const lastId = lastPlayer ? parseInt(lastPlayer.playerId) : 0;
    playerId = String(lastId + 1).padStart(3, '0');
  }
  
  // 继续登录逻辑...
});
```

### 分配 ID 给玩家

创建一个简单的管理脚本 `server/scripts/assignPlayerId.js`：

```javascript
const { Player, AllowedId } = require('../models');

async function assignPlayerId(playerEmail, playerName) {
  // 找到一个未使用的 ID
  const availableId = await AllowedId.findOne({
    where: { used: false },
    order: [['playerId', 'ASC']]
  });
  
  if (!availableId) {
    console.log('❌ 没有可用的 ID 了！');
    return;
  }
  
  // 标记为已使用
  await availableId.update({
    used: true,
    assignedTo: `${playerName} (${playerEmail})`
  });
  
  console.log(`✅ 分配 ID: ${availableId.playerId} 给 ${playerName}`);
  console.log(`📧 发送此 ID 给玩家: ${playerEmail}`);
  
  return availableId.playerId;
}

// 使用示例
assignPlayerId('player@email.com', 'Player Name');
```

---

## 部署后测试

### 测试清单

1. **基础访问**
   ```bash
   curl https://你的应用.herokuapp.com/health
   ```
   应该返回：`{"status":"ok"}`

2. **登录测试**
   - 访问游戏 URL
   - 输入一个测试 ID（如 `001`）
   - 检查是否能进入游戏

3. **数据库测试**
   ```bash
   # Heroku
   heroku pg:psql
   SELECT * FROM "Players" LIMIT 5;
   
   # 检查表结构
   \dt
   ```

4. **API 测试**
   ```bash
   # 测试登录 API
   curl -X POST https://你的应用.herokuapp.com/api/login \
     -H "Content-Type: application/json" \
     -d '{"playerId":"001"}'
   ```

5. **完整游戏流程**
   - [ ] 登录成功
   - [ ] 选择性别
   - [ ] 查看过场动画
   - [ ] 进入主地图
   - [ ] 与 NPC 对话
   - [ ] 记录餐食
   - [ ] 查看线索本
   - [ ] 语言切换
   - [ ] 最终报告生成

---

## 常见问题

### Q1: 部署后页面显示空白？
**A**: 检查 `package.json` 中的 `homepage` 字段：
```json
"homepage": "."
```
然后重新构建：
```bash
npm run build
git add .
git commit -m "Fix homepage"
git push heroku main
```

### Q2: 数据库连接失败？
**A**: 检查环境变量：
```bash
heroku config:get DATABASE_URL
```
确保格式正确：`postgres://username:password@host:5432/database`

### Q3: API Key 错误？
**A**: 确保在 Heroku/Render 中设置了环境变量：
```bash
heroku config:set GEMINI_API_KEY=你的key
```

### Q4: 游戏加载很慢？
**A**: 
- Render 免费版有"冷启动"问题，第一次访问需要等待
- 可以使用 UptimeRobot 定期 ping 你的应用保持活跃
- 或升级到付费计划

### Q5: 如何查看日志？
**A**: 
```bash
# Heroku
heroku logs --tail

# Render
在 Dashboard 的 "Logs" 标签查看
```

### Q6: 如何更新游戏？
**A**: 
```bash
# 修改代码后
npm run build
git add .
git commit -m "Update game"
git push heroku main

# Heroku 会自动重新部署
```

### Q7: 如何备份数据库？
**A**: 
```bash
# Heroku 自动每天备份（付费版）
# 手动备份
heroku pg:backups:capture
heroku pg:backups:download

# Render 需要手动导出
pg_dump -h your-host -U username -d database > backup.sql
```

---

## 🎮 给玩家的使用说明

部署成功后，可以给玩家发送这样的邮件：

```
亲爱的玩家，

欢迎来到《美食村之旅》！

🎮 游戏链接：https://gourmet-village-game.herokuapp.com

🆔 你的玩家 ID：XXX

📝 如何开始：
1. 点击上方链接
2. 输入你的玩家 ID
3. 选择语言和角色
4. 开始你的7天美食之旅！

💡 游戏提示：
- 每天记录三餐（早、中、晚）
- 与村民对话收集线索
- 完成任务解锁新角色
- 7天后获得专属报告

🌐 支持语言：中文/English

❓ 遇到问题？联系：your-email@example.com

祝游戏愉快！🍜✨
```

---

## 📊 监控和维护

### 推荐工具
1. **UptimeRobot** (https://uptimerobot.com/) - 免费监控，应用下线时发邮件
2. **Google Analytics** - 追踪玩家访问
3. **Sentry** - 错误监控

### 定期维护
- 每周检查日志
- 每月备份数据库
- 监控 API 使用量（避免超出免费额度）

---

## ✅ 部署完成检查清单

- [ ] 游戏可以通过 URL 访问
- [ ] 数据库已初始化
- [ ] 环境变量已配置
- [ ] 至少一个测试 ID 可以登录
- [ ] 所有游戏功能正常（对话、记录、报告）
- [ ] 中英文切换正常
- [ ] 移动端和桌面端都能访问
- [ ] 给玩家发送了游戏链接和 ID
- [ ] 设置了应用监控

---

## 🚀 下一步

1. **测试期** (1-2周)
   - 邀请少量玩家测试
   - 收集反馈
   - 修复 bug

2. **正式发布**
   - 批量生成玩家 ID
   - 发送游戏链接
   - 设置监控和备份

3. **数据分析**
   - 收集游戏数据
   - 分析玩家行为
   - 优化游戏体验

**祝部署顺利！** 🎉

