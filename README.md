# 🎮 Gourmet Village - A Mystery Journey Through Food

[中文说明](#-美食村---一场关于食物的解谜之旅-chinese) | [English Version](#-gourmet-village---a-mystery-journey-through-food-english)

---

## 🎮 美食村 - 一场关于食物的解谜之旅 (Chinese)

一款结合了生活记录与解谜探索的互动式RPG游戏。在这个宁静的小村庄里，华师父突然消失了。作为他曾经的学徒，你踏上了寻找真相的旅程。通过记录日常饮食、与村民对话，在看似平常的生活中寻找线索...

### 🌐 在线游玩

**游戏链接**: [https://foodtracking-t1-4d8572bed4a3.herokuapp.com/](https://foodtracking-t1-4d8572bed4a3.herokuapp.com/)

**支持平台**:
- 💻 **电脑端**: 推荐使用Chrome、Edge、Safari浏览器
- 📱 **手机端**: 支持竖屏和横屏模式
- 🎮 **最佳体验**: 手机横屏 / 平板电脑

---

### 📋 目录
- [游戏简介](#-游戏简介)
- [技术栈](#-技术栈)
- [本地开发](#-本地开发)
- [部署指南](#-部署指南)
- [游戏提示](#-游戏提示)

---

### 🎨 游戏简介

**故事背景**

三天前，华师父不辞而别。厨房里的火还温着，但人已经走了。

村里的人都在议论纷纷。你是他曾经的学徒，或许只有你能找到真相。

但这不仅仅是一次简单的寻找...

华师父有一个习惯——他总是随身带着笔记本，记录每一顿饭，记录与人的交流。

也许，追随他的方式，你能理解他的想法。

**游戏特色**

- 🎭 **角色驱动叙事**: 每个村民都有独特的性格和故事
- 📝 **智能对话系统**: 使用AI驱动的自然对话记录饮食
- 🔍 **循序渐进的解谜**: 通过7天的旅程逐步揭开真相
- 🎨 **精美像素画风**: 横版卷轴地图 + 现代UI设计
- 🌍 **双语支持**: 中文/English一键切换
- 🎵 **沉浸式体验**: 配音、BGM、细腻的叙事

---

### 🛠️ 技术栈

**前端**
- React 18 (UI框架)
- Phaser 3 (游戏引擎)
- React Router DOM (路由管理)

**后端**
- Node.js + Express (服务器)
- PostgreSQL + Sequelize ORM (数据库)
- Heroku (部署平台)

**AI集成**
- ConvAI API (角色对话与语音)
- Google Gemini API (智能餐食对话与分析)
- Eleven Labs (角色配音)

---

### 💻 本地开发

#### 1️⃣ 环境要求

- Node.js >= 18.x
- PostgreSQL >= 14.x
- npm >= 9.x

#### 2️⃣ 安装依赖

```bash
# 克隆仓库
git clone <repository-url>
cd Food-Tracking

# 安装前端依赖
npm install

# 安装后端依赖
cd server
npm install
cd ..
```

#### 3️⃣ 环境变量配置

**后端配置** (`server/.env`):
```env
DATABASE_URL=postgresql://username:password@localhost:5432/foodtracking
PORT=3001

# ConvAI API Keys (支持多个，自动轮询)
CONVAI_API_KEY=your_convai_key_1
CONVAI_API_KEY_2=your_convai_key_2
CONVAI_API_KEY_3=your_convai_key_3

# Gemini API Keys (支持多个，自动轮询)
GEMINI_API_KEY=your_gemini_key_1
GEMINI_API_KEY_2=your_gemini_key_2
GEMINI_API_KEY_3=your_gemini_key_3
```

**前端配置** (`.env`):
```env
REACT_APP_API_URL=http://localhost:3001/api
```

#### 4️⃣ 数据库初始化

```bash
# 连接到PostgreSQL
psql -U postgres

# 创建数据库
CREATE DATABASE foodtracking;

# 退出psql
\q

# 运行迁移（如果有）
cd server
npm run migrate
```

#### 5️⃣ 启动开发服务器

```bash
# 终端1: 启动后端
cd server
npm start
# 后端运行在 http://localhost:3001

# 终端2: 启动前端
npm start
# 前端运行在 http://localhost:3000
```

---

### 🚀 部署指南

#### 部署到 Heroku

**前提条件**:
- 已安装 [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)
- 拥有 Heroku 账号

**步骤**:

```bash
# 1. 登录 Heroku
heroku login

# 2. 创建应用（如果还没有）
heroku create your-app-name

# 3. 添加 PostgreSQL 数据库
heroku addons:create heroku-postgresql:essential-0

# 4. 设置环境变量
heroku config:set CONVAI_API_KEY=your_key
heroku config:set GEMINI_API_KEY=your_key
# ... 其他环境变量

# 5. 部署
git push heroku main

# 6. 运行数据库迁移（如果需要）
heroku run node server/migrations/your-migration-file.js

# 7. 打开应用
heroku open
```

**查看日志**:
```bash
heroku logs --tail --app your-app-name
```

**管理数据库**:
```bash
# 连接到生产数据库
heroku pg:psql --app your-app-name

# 查看数据库信息
heroku pg:info --app your-app-name
```

**更新代码**:
```bash
# 构建前端
npm run build

# 提交更改
git add .
git commit -m "Your commit message"

# 推送到 Heroku
git push heroku main
```

---

### 🎮 游戏提示

**新手指南**

1. **选择角色**: 从阿宇（River）和小琪（Sage）中选择你的角色
2. **探索村庄**: 横向滚动探索村庄，点击NPC进行对话
3. **记录饮食**: 每天记录三餐（早餐、午餐、晚餐）
4. **收集线索**: 留意对话中的细节，线索会逐渐浮现
5. **解开谜题**: 完成7天的记录，揭开华师父消失的真相

**游戏机制**

- 📅 **天数系统**: 游戏按真实时间推进，记录晚餐解锁下一天
- 🔓 **NPC解锁**: 随着天数增加，新的村民会出现
- 🗝️ **线索获取**: 记录不同餐食会获得不同类型的线索
- 📊 **最终报告**: 完成全部记录后获得个性化的食谱与健康分析

**小技巧**

- 💬 与NPC对话时要耐心，他们的每一句话都可能有深意
- 📝 认真回答关于饮食的问题，这些数据会用于生成你的专属报告
- 🎯 不要急于完成任务，慢慢体验叙事和角色互动
- 🌙 记得记录晚餐，这是解锁下一天的关键

---

### 📂 项目结构

```
Food-Tracking/
├── src/                      # 前端源码
│   ├── components/           # React组件
│   ├── phaser/              # Phaser游戏逻辑
│   │   ├── MainScene.js     # 主游戏场景
│   │   ├── dialog/          # 对话系统
│   │   └── config/          # 配置文件
│   ├── pages/               # 页面组件
│   └── assets/              # 静态资源
│       └── audio/           # 音频文件
├── server/                   # 后端源码
│   ├── routes/              # API路由
│   ├── models/              # 数据库模型
│   ├── data/                # 游戏数据
│   └── migrations/          # 数据库迁移
├── public/                   # 公共资源
│   └── assets/              # 游戏资源
└── build/                    # 生产构建

```

---

### 🗄️ 数据库架构

**主要数据表**:

- `Players`: 玩家账号与进度
- `PlayerProgresses`: 每日解锁进度
- `MealRecords`: 餐食记录（包含详细问答）
- `ConversationHistories`: 对话历史
- `Clues`: 收集到的线索
- `allowed_ids`: 游戏访问白名单

**查询示例**:
```sql
-- 查看玩家进度
SELECT "playerId", "currentDay", "gameCompleted" 
FROM "Players" 
ORDER BY "playerId";

-- 查看餐食记录
SELECT "playerId", day, "mealType", "mealContent" 
FROM "MealRecords" 
WHERE "playerId" = '001' 
ORDER BY day, "recordedAt";
```

---

### 🔧 常见问题

**Q: 游戏卡在加载页面？**
A: 检查网络连接，刷新页面。如果问题持续，清除浏览器缓存。

**Q: ConvAI/Gemini API 失败？**
A: 系统会自动轮询多个API key，如果所有key都失败会回退到备用方案。

**Q: 如何重置游戏进度？**
A: 清除浏览器localStorage，或使用新的玩家ID登录。

**Q: 移动端体验不佳？**
A: 建议使用横屏模式，获得最佳游戏体验。

---

### 📝 开发日志

**最新版本**: v1.0.0

**更新内容**:
- ✨ NPC分段开场白系统
- 🎵 华师父语音配音集成
- 📊 基于真实数据的个性化Final Report
- 🎭 中性化角色名称（阿宇/小琪）
- 🌍 完整中英双语支持
- 🔧 多API key轮询机制

---

### 👥 贡献

欢迎提交Issue和Pull Request！

---

### 📄 许可证

本项目仅用于学术和研究目的。

---

### 🎮 开始你的旅程

准备好了吗？

华师父的秘密等待着你去发现。

记住——真正的美味不在于稀有的食材，而在于用心。

**[🎮 立即开始游戏](https://foodtracking-t1-4d8572bed4a3.herokuapp.com/)**

---

## 🎮 Gourmet Village - A Mystery Journey Through Food (English)

An interactive RPG that blends lifestyle journaling with narrative exploration. Master Chef Hua has vanished from the village. As his former apprentice, you return to uncover the truth. Record your daily meals, converse with villagers, and discover clues hidden in everyday moments...

### 🌐 Play Online

**Game Link**: [https://foodtracking-t1-4d8572bed4a3.herokuapp.com/](https://foodtracking-t1-4d8572bed4a3.herokuapp.com/)

**Supported Platforms**:
- 💻 **Desktop**: Chrome, Edge, Safari (Recommended)
- 📱 **Mobile**: Portrait and Landscape modes
- 🎮 **Best Experience**: Mobile Landscape / Tablet

---

### 📋 Table of Contents
- [About](#-about)
- [Tech Stack](#-tech-stack-1)
- [Local Development](#-local-development-1)
- [Deployment Guide](#-deployment-guide)
- [Gameplay Tips](#-gameplay-tips)

---

### 🎨 About

**Story**

Three days ago, Master Chef Hua left without a word.

The fire in his kitchen was still warm—but he was gone.

The villagers are talking. You were his apprentice. Perhaps only you can find the truth.

But this is more than a simple search...

Master Hua had a habit—he always carried a notebook, recording every meal, every conversation.

Perhaps by following his method, you can understand what he was thinking.

**Features**

- 🎭 **Character-Driven Narrative**: Each villager has a unique personality and story
- 📝 **AI-Powered Dialogue**: Natural conversation-based meal logging
- 🔍 **Progressive Mystery**: Uncover the truth over 7 days
- 🎨 **Beautiful Pixel Art**: Side-scrolling map with modern UI
- 🌍 **Bilingual**: Chinese/English toggle
- 🎵 **Immersive Experience**: Voice acting, BGM, and detailed storytelling

---

### 🛠️ Tech Stack (Same as Chinese section)

---

### 💻 Local Development (Same as Chinese section)

---

### 🚀 Deployment Guide (Same as Chinese section)

---

### 🎮 Gameplay Tips

**Getting Started**

1. **Choose Character**: Select between River or Sage
2. **Explore Village**: Scroll horizontally, click NPCs to interact
3. **Record Meals**: Log breakfast, lunch, and dinner each day
4. **Collect Clues**: Pay attention to conversation details
5. **Solve Mystery**: Complete 7 days to reveal Master Hua's secret

**Game Mechanics**

- 📅 **Day System**: Progresses with real time; record dinner to unlock next day
- 🔓 **NPC Unlocking**: New villagers appear as days progress
- 🗝️ **Clue Types**: Different meals yield different clue types
- 📊 **Final Report**: Get personalized recipe & health analysis

**Tips**

- 💬 Be patient with NPCs—every word may have meaning
- 📝 Answer meal questions thoughtfully—data shapes your final report
- 🎯 Don't rush—savor the narrative and character interactions
- 🌙 Remember to record dinner—it's key to unlocking the next day

---

### 📂 Project Structure (Same as Chinese section)

---

### 🗄️ Database Schema (Same as Chinese section)

---

### 🔧 FAQ (Same as Chinese section)

---

### 📝 Changelog (Same as Chinese section)

---

### 👥 Contributing

Issues and Pull Requests are welcome!

---

### 📄 License

This project is for academic and research purposes only.

---

### 🎮 Begin Your Journey

Are you ready?

Master Hua's secret awaits your discovery.

Remember—true flavor comes not from rare ingredients, but from paying attention.

**[🎮 Play Now](https://foodtracking-t1-4d8572bed4a3.herokuapp.com/)**

---

**Made with ❤️ and 🍜**
