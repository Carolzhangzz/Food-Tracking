# ✅ 部署前检查清单

在运行部署命令之前，请确保完成以下所有步骤：

## 📋 必需文件检查

- [ ] `Procfile` 文件存在（已创建 ✓）
- [ ] `package.json` 有正确的 `start` 脚本（已配置 ✓）
- [ ] `package.json` 有 `heroku-postbuild` 脚本（已配置 ✓）
- [ ] `.gitignore` 包含 `.env` 和 `node_modules`（已配置 ✓）
- [ ] `build/` 文件夹存在且是最新的

## 🔑 API Keys 准备

- [ ] Gemini API Key 已获取
  - 访问: https://aistudio.google.com/
  - 测试: `curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_KEY"`

- [ ] ConvAI API Key 已获取
  - 访问: https://convai.com/
  - 在 Dashboard 查看 Character IDs

## 💾 数据库检查

- [ ] 本地数据库可以正常连接
- [ ] `server/scripts/initDatabase.js` 可以正常运行
- [ ] 数据表结构正确（Players, MealRecords, Clues 等）

## 🧪 本地测试通过

- [ ] 前端可以启动: `npm run dev:client`
- [ ] 后端可以启动: `npm run dev:server`
- [ ] 构建成功: `npm run build`
- [ ] 生产模式运行: `npm start`（访问 localhost:3001）

## 🎮 游戏功能测试

- [ ] 登录功能正常（输入 ID，选择语言）
- [ ] 性别选择正常
- [ ] 过场动画播放
- [ ] 主地图加载
- [ ] 可以与 NPC 对话
- [ ] 可以记录餐食
- [ ] 线索本显示正常
- [ ] 中英文切换正常
- [ ] Final Report 生成正常

## 🌐 Git 状态

- [ ] 所有代码已提交
  ```bash
  git status
  # 应该显示: nothing to commit, working tree clean
  ```

- [ ] 已连接到 Git 仓库
  ```bash
  git remote -v
  # 如果使用 Heroku: 应该有 heroku remote
  # 如果使用 GitHub: 应该有 origin remote
  ```

## 🔧 Heroku 专用检查

- [ ] Heroku CLI 已安装
  ```bash
  heroku --version
  ```

- [ ] 已登录 Heroku
  ```bash
  heroku auth:whoami
  ```

- [ ] Heroku 应用已创建
  ```bash
  heroku apps:info
  ```

## 📝 环境变量清单

部署后需要在 Heroku 设置的变量：

```bash
# 必需变量
GEMINI_API_KEY=你的key
CONVAI_API_KEY=你的key
SESSION_SECRET=随机32位字符串
NODE_ENV=production

# 可选变量
LOG_LEVEL=info
DEBUG=false

# Heroku 自动提供
DATABASE_URL=（自动）
PORT=（自动）
```

验证命令：
```bash
heroku config
```

## 🚀 部署命令

如果所有检查都通过，运行：

```bash
# 方法 1: 使用提供的脚本
chmod +x deploy.sh
./deploy.sh heroku

# 方法 2: 手动部署
git push heroku main

# 方法 3: 强制部署（如果遇到冲突）
git push heroku main --force
```

## 📊 部署后验证

- [ ] 应用可以访问
  ```bash
  heroku open
  ```

- [ ] 健康检查通过
  ```bash
  curl https://你的应用.herokuapp.com/health
  # 应该返回: {"status":"ok"}
  ```

- [ ] 数据库已初始化
  ```bash
  heroku run node server/scripts/initDatabase.js
  ```

- [ ] 玩家 ID 已创建
  ```bash
  heroku run node server/scripts/assignPlayerId.js list
  ```

- [ ] 日志正常
  ```bash
  heroku logs --tail
  # 不应该有错误
  ```

## 🎯 测试游戏功能

使用浏览器访问部署的游戏，测试：

- [ ] 登录页面加载
- [ ] 可以输入 ID 并登录
- [ ] 选择语言和性别
- [ ] 进入游戏主界面
- [ ] NPC 对话正常（ConvAI API 工作）
- [ ] 餐食记录正常（Gemini API 工作）
- [ ] 数据保存到数据库
- [ ] 线索显示正常
- [ ] Final Report 生成正常

## ⚠️ 常见问题检查

如果遇到问题，检查：

### 应用崩溃或无法访问
```bash
heroku logs --tail
# 查看错误信息
```

### 数据库连接失败
```bash
heroku config:get DATABASE_URL
# 确保格式: postgres://user:pass@host:5432/db
```

### API 调用失败
```bash
heroku config
# 确保 GEMINI_API_KEY 和 CONVAI_API_KEY 都已设置
```

### 构建失败
```bash
# 查看构建日志
heroku logs --source app --dyno build

# 清除缓存重新构建
heroku plugins:install heroku-repo
heroku repo:purge_cache -a your-app-name
git push heroku main
```

## 📞 需要帮助？

- 📖 查看完整指南: `DEPLOYMENT_GUIDE.md`
- 🚀 快速开始: `QUICK_DEPLOY.md`
- 💬 Heroku 文档: https://devcenter.heroku.com/

---

**全部完成？开始部署吧！** 🚀

```bash
git push heroku main
```

