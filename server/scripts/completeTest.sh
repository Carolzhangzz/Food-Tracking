#!/bin/bash

echo "🔧 开始完整测试和修复..."
echo ""

# 1. 清空线索表
echo "1️⃣ 清空线索表..."
node server/scripts/truncateClues.js
echo ""

# 2. 检查当前状态
echo "2️⃣ 检查当前数据库状态..."
node server/scripts/fullDiagnosis.js
echo ""

echo "✅ 准备工作完成！"
echo ""
echo "📝 现在请执行以下步骤："
echo ""
echo "3️⃣ 重启后端服务器："
echo "   - 在后端终端按 Ctrl+C 停止"
echo "   - 运行: cd /Users/carol/Documents/2025summer/rpg_new/Food-Tracking && node server/app.js"
echo ""
echo "4️⃣ 刷新浏览器: Cmd + Shift + R"
echo ""
echo "5️⃣ 登录游戏，与 Uncle Bo 对话，记录 breakfast"
echo ""
echo "6️⃣ 对话完成后，在后端终端查找这些日志："
echo "   👤 记录餐食 - NPC ID: uncle_bo, 最终名字: Village Head, 餐食: breakfast"
echo "   🎯 [线索判定] NPC: uncle_bo, 餐食: breakfast, 已有vague数: 0"
echo "   ℹ️ [breakfast] 给予模糊线索 (阶段 1, string): Your master..."
echo "   📝 正在保存线索: npcName=Village Head, clueType=vague"
echo "   ✅ 线索保存成功！"
echo ""
echo "7️⃣ 然后运行诊断验证:"
echo "   node server/scripts/fullDiagnosis.js"
echo ""
