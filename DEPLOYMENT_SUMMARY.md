# 🎮 游戏部署总结

## 📦 已为你准备的文件

### 1. 📘 完整部署指南
**文件**: `DEPLOYMENT_GUIDE.md`
- 详细的部署步骤
- 多平台方案对比（Heroku, Render, Railway）
- 环境变量配置
- 玩家 ID 管理
- 常见问题解决

### 2. 🚀 快速部署指南  
**文件**: `QUICK_DEPLOY.md`
- 5分钟准备清单
- 10分钟部署步骤
- 玩家邮件模板
- 常用命令速查

### 3. ✅ 部署检查清单
**文件**: `DEPLOYMENT_CHECKLIST.md`
- 部署前检查项
- 部署后验证
- 故障排查

### 4. 🔧 部署脚本
**文件**: `deploy.sh`
- 自动化部署脚本
- 支持 Heroku 和 Render
- 使用方法: `./deploy.sh heroku`

### 5. 🆔 玩家ID管理工具
**文件**: `server/scripts/assignPlayerId.js`
- 批量创建 ID
- 分配 ID 给玩家
- 查看可用/已用 ID
- 使用方法见下文

### 6. ⚙️ 配置文件
- `Procfile` - Heroku 启动配置 ✓
- `.gitignore` - Git 忽略文件（已更新）✓
- `env.template` - 环境变量模板 ✓

---

## 🚀 最简单的部署方式（推荐：Heroku）

### 一键部署流程

```bash
# 1. 登录 Heroku
cd /Users/carol/Documents/2025summer/rpg_new/Food-Tracking
heroku login

# 2. 创建应用和数据库
heroku create your-game-name
heroku addons:create heroku-postgresql:essential-0

# 3. 设置环境变量（替换为你的 API Keys）
heroku config:set GEMINI_API_KEY=你的Gemini_Key
heroku config:set CONVAI_API_KEY=你的ConvAI_Key
heroku config:set SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
heroku config:set NODE_ENV=production

# 4. 部署！
git add .
git commit -m "Deploy to production"
git push heroku main

# 5. 初始化
heroku run node server/scripts/initDatabase.js
heroku run node server/scripts/assignPlayerId.js create 50

# 6. 打开游戏
heroku open
```

**就这么简单！** 🎉

你的游戏链接：`https://your-game-name.herokuapp.com`

---

## 🆔 玩家 ID 管理

### 创建玩家 ID
```bash
# 本地创建（开发测试）
node server/scripts/assignPlayerId.js create 50

# Heroku 上创建（生产环境）
heroku run node server/scripts/assignPlayerId.js create 50 1
# 创建 50 个 ID，从 001 开始
```

### 查看可用 ID
```bash
# 本地
node server/scripts/assignPlayerId.js list

# Heroku
heroku run node server/scripts/assignPlayerId.js list
```

输出示例：
```
📊 玩家 ID 统计
━━━━━━━━━━━━━━━━━━━━━━━━
总数: 50
已使用: 5
剩余: 45
━━━━━━━━━━━━━━━━━━━━━━━━

🆓 可用的 ID（前 20 个）:
  - 006
  - 007
  - 008
  ...
```

### 分配 ID 给玩家
```bash
# 本地
node server/scripts/assignPlayerId.js assign "张三" "zhang@email.com"

# Heroku
heroku run node server/scripts/assignPlayerId.js assign "张三" "zhang@email.com"
```

输出：
```
✅ ID 分配成功！
━━━━━━━━━━━━━━━━━━━━━━━━
🆔 玩家 ID: 006
👤 姓名: 张三
📧 邮箱: zhang@email.com
━━━━━━━━━━━━━━━━━━━━━━━━
```

### 查看已分配的 ID
```bash
# 本地
node server/scripts/assignPlayerId.js assigned

# Heroku
heroku run node server/scripts/assignPlayerId.js assigned
```

---

## 📧 给玩家发送邮件

### 邮件模板（中文）

```
主题: 🎮 欢迎来到《美食村之旅》- 你的专属游戏邀请

亲爱的 [玩家姓名]，

欢迎参与《美食村之旅》！这是一款互动式饮食记录游戏，通过7天的游戏体验，帮助你了解自己的饮食习惯。

━━━━━━━━━━━━━━━━━━━━━━━━

🆔 你的玩家 ID: XXX
🎮 游戏链接: https://your-game-name.herokuapp.com
🌐 支持语言: 中文 / English

━━━━━━━━━━━━━━━━━━━━━━━━

📝 如何开始：

1. 点击上方游戏链接
2. 输入你的玩家 ID（XXX）
3. 选择语言（中文/English）
4. 选择角色性别
5. 观看开场动画，了解故事背景
6. 开始你的7天美食之旅！

━━━━━━━━━━━━━━━━━━━━━━━━

🎯 游戏玩法：

每天：
• 记录三餐（早餐、午餐、晚餐）
• 与村民对话，回答饮食相关问题
• 收集线索，追寻消失的大厨

7天后：
• 获得个性化饮食分析报告
• 专属健康建议
• 定制化食谱推荐
• 完成游戏！

━━━━━━━━━━━━━━━━━━━━━━━━

💡 温馨提示：

✓ 建议在电脑上游玩（手机也支持）
✓ 每天只需 10-15 分钟
✓ 诚实记录，报告更准确
✓ 可以随时切换中英文
✓ 数据安全，隐私保护

━━━━━━━━━━━━━━━━━━━━━━━━

❓ 遇到问题？

• 技术支持：your-email@example.com
• 游戏时间：建议每天晚上记录当天的餐食
• 数据保存：云端自动保存，无需担心

祝游戏愉快！🍜✨

《美食村之旅》研究团队
```

### 邮件模板（English）

```
Subject: 🎮 Welcome to Gourmet Village - Your Game Invitation

Dear [Player Name],

Welcome to "Gourmet Village Journey"! This is an interactive food tracking game designed to help you understand your eating habits through a 7-day gaming experience.

━━━━━━━━━━━━━━━━━━━━━━━━

🆔 Your Player ID: XXX
🎮 Game Link: https://your-game-name.herokuapp.com
🌐 Languages: 中文 / English

━━━━━━━━━━━━━━━━━━━━━━━━

📝 How to Start:

1. Click the game link above
2. Enter your Player ID (XXX)
3. Choose your language
4. Select your character gender
5. Watch the opening cutscene
6. Begin your 7-day journey!

━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Gameplay:

Daily Tasks:
• Record three meals (breakfast, lunch, dinner)
• Talk with villagers, answer food-related questions
• Collect clues about the missing chef

After 7 Days:
• Receive personalized dietary analysis
• Get health recommendations
• Unlock custom recipes
• Complete the game!

━━━━━━━━━━━━━━━━━━━━━━━━

💡 Tips:

✓ Best on desktop (mobile supported)
✓ Only 10-15 minutes per day
✓ Be honest for accurate report
✓ Switch language anytime
✓ Your data is safe & private

━━━━━━━━━━━━━━━━━━━━━━━━

❓ Need Help?

• Support: your-email@example.com
• Best Time: Record meals in the evening
• Auto-save: Cloud backup, no worries

Enjoy your journey! 🍜✨

The Gourmet Village Team
```

---

## 📊 部署成功后的监控

### 实时日志
```bash
heroku logs --tail
```

### 应用状态
```bash
heroku ps
```

### 数据库状态
```bash
heroku pg:info
```

### 查看玩家数据
```bash
heroku pg:psql
SELECT * FROM "Players";
SELECT COUNT(*) FROM "MealRecords";
```

---

## 🔧 常用维护命令

### 重启应用
```bash
heroku restart
```

### 更新游戏
```bash
# 修改代码后
npm run build
git add .
git commit -m "Update: 描述你的修改"
git push heroku main
```

### 备份数据库
```bash
heroku pg:backups:capture
heroku pg:backups:download
```

### 清除缓存
```bash
heroku plugins:install heroku-repo
heroku repo:purge_cache -a your-app-name
```

---

## 💰 费用说明

### Heroku 免费套餐
- ✅ 1000 小时/月（足够 24/7 运行）
- ✅ PostgreSQL 数据库（Essential-0: 免费）
- ✅ 自动 SSL 证书
- ✅ 自定义域名

### API 使用（免费额度）
- **Gemini API**: 免费每分钟 15 次请求
- **ConvAI API**: 免费套餐每月 1000 次对话

### 升级选项（如需要）
- Heroku Eco: $5/月（不休眠）
- Heroku Basic: $7/月（更多内存）

---

## 🎯 下一步建议

### 1. 测试期（1-2周）
- [ ] 邀请 5-10 位测试玩家
- [ ] 收集反馈
- [ ] 修复发现的 bug
- [ ] 优化用户体验

### 2. 数据收集
- [ ] 设置 Google Analytics（可选）
- [ ] 监控玩家完成率
- [ ] 分析游戏数据

### 3. 正式发布
- [ ] 批量创建玩家 ID
- [ ] 发送游戏邀请邮件
- [ ] 设置应用监控
- [ ] 准备技术支持

---

## 📞 需要帮助？

### 文档
- 📖 完整指南: `DEPLOYMENT_GUIDE.md`
- 🚀 快速开始: `QUICK_DEPLOY.md`
- ✅ 检查清单: `DEPLOYMENT_CHECKLIST.md`

### 在线资源
- Heroku 文档: https://devcenter.heroku.com/
- Gemini API: https://ai.google.dev/
- ConvAI: https://docs.convai.com/

### 常见问题
查看 `DEPLOYMENT_GUIDE.md` 的"常见问题"部分

---

## ✅ 快速检查

部署成功的标志：

- [ ] ✅ 可以访问游戏 URL
- [ ] ✅ 登录功能正常
- [ ] ✅ 可以与 NPC 对话
- [ ] ✅ 可以记录餐食
- [ ] ✅ 线索本显示正常
- [ ] ✅ 语言切换正常
- [ ] ✅ Final Report 生成正常

**全部打勾？恭喜！部署成功！** 🎉

---

## 🎮 开始你的游戏研究吧！

现在你有了：
- ✅ 一个可以分享的游戏链接
- ✅ 玩家 ID 管理系统
- ✅ 完整的部署文档
- ✅ 自动化脚本
- ✅ 邮件模板

**准备好迎接玩家了吗？** 🚀

---

**祝部署顺利！有任何问题随时查阅文档。** 💪

