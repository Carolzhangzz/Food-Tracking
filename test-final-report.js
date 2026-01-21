require('dotenv').config();
const axios = require('axios');

// 测试 Final Report API
async function testFinalReport() {
  // 使用真实玩家ID进行测试（可以更改为任何存在的玩家ID）
  const testPlayerId = process.argv[2] || '021'; // 默认使用 021，或从命令行参数获取
  
  console.log('\n🧪 ================================');
  console.log(`   测试 Final Report API`);
  console.log(`   测试玩家ID: ${testPlayerId}`);
  console.log('   ================================\n');

  try {
    // 🔧 使用 Heroku 生产环境 API
    const API_URL = 'https://foodtracking-t1-4d8572bed4a3.herokuapp.com/api';
    const endpoint = `${API_URL}/generate-final-report`;
    
    console.log(`🔗 完整 URL: ${endpoint}`);

    console.log(`📡 API 端点: ${endpoint}`);
    console.log(`📤 请求参数: playerId = ${testPlayerId}\n`);
    console.log('⏳ 正在调用 API...\n');

    const startTime = Date.now();
    
    const response = await axios.post(endpoint, {
      playerId: testPlayerId
    }, {
      timeout: 60000 // 60秒超时
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`✅ API 响应成功！ (耗时: ${duration}秒)\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (response.data.success) {
      const report = response.data.report;
      
      console.log('📊 Final Report 内容:\n');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      // 1. 玩家信息
      if (report.playerInfo) {
        console.log('👤 玩家信息:');
        console.log(`   ID: ${report.playerInfo.playerId || testPlayerId}`);
        console.log(`   餐食记录数: ${report.playerInfo.mealCount || 'N/A'}`);
        console.log(`   游戏天数: ${report.playerInfo.days || 'N/A'}`);
        console.log('');
      }

      // 2. 餐食总结
      if (report.mealSummary) {
        console.log('🍽️ 餐食总结:');
        console.log(JSON.stringify(report.mealSummary, null, 2));
        console.log('');
      }

      // 3. 师父的信
      if (report.masterLetter) {
        console.log('📜 华师父的信:');
        if (typeof report.masterLetter === 'string') {
          console.log(`   ${report.masterLetter}`);
        } else if (report.masterLetter.zh || report.masterLetter.en) {
          console.log(`   [中文] ${report.masterLetter.zh || 'N/A'}`);
          console.log(`   [英文] ${report.masterLetter.en || 'N/A'}`);
        }
        console.log('');
      }

      // 4. 健康分析
      if (report.healthAnalysis) {
        console.log('🏥 健康分析:');
        if (typeof report.healthAnalysis === 'string') {
          console.log(`   ${report.healthAnalysis}`);
        } else if (report.healthAnalysis.zh || report.healthAnalysis.en) {
          console.log(`   [中文] ${report.healthAnalysis.zh || 'N/A'}`);
          console.log(`   [英文] ${report.healthAnalysis.en || 'N/A'}`);
        }
        console.log('');
      }

      // 5. 定制食谱
      if (report.recipe) {
        console.log('🧑‍🍳 定制食谱:');
        console.log(`   名称: ${report.recipe.name?.zh || report.recipe.name?.en || 'N/A'}`);
        console.log(`   描述: ${report.recipe.description?.zh || report.recipe.description?.en || 'N/A'}`);
        
        if (report.recipe.ingredients) {
          console.log(`   食材:`);
          if (Array.isArray(report.recipe.ingredients)) {
            report.recipe.ingredients.forEach((ing, i) => {
              console.log(`     ${i + 1}. ${ing}`);
            });
          } else {
            console.log(`     ${JSON.stringify(report.recipe.ingredients)}`);
          }
        }
        
        if (report.recipe.steps) {
          console.log(`   步骤:`);
          if (Array.isArray(report.recipe.steps)) {
            report.recipe.steps.forEach((step, i) => {
              console.log(`     ${i + 1}. ${step}`);
            });
          } else {
            console.log(`     ${JSON.stringify(report.recipe.steps)}`);
          }
        }
        console.log('');
      }

      // 6. 完整 JSON
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('📝 完整 Report JSON:');
      console.log(JSON.stringify(report, null, 2));
      console.log('');

      // 7. 检查是否基于真实数据
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('🔍 数据来源检查:');
      
      const hasRealMealData = report.mealSummary && Object.keys(report.mealSummary).length > 0;
      const hasRecipeWithSpecificIngredients = report.recipe && report.recipe.ingredients && report.recipe.ingredients.length > 0;
      
      if (hasRealMealData) {
        console.log('   ✅ 包含真实餐食数据');
      } else {
        console.log('   ⚠️  缺少餐食数据（可能是fallback模板）');
      }
      
      if (hasRecipeWithSpecificIngredients) {
        console.log('   ✅ 食谱包含具体食材');
      } else {
        console.log('   ⚠️  食谱可能是通用模板');
      }
      console.log('');

    } else {
      console.log('❌ API 返回失败:');
      console.log(JSON.stringify(response.data, null, 2));
    }

  } catch (error) {
    console.error('\n❌ 测试失败:\n');
    if (error.response) {
      console.error(`   HTTP 状态: ${error.response.status}`);
      console.error(`   错误信息: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.request) {
      console.error('   没有收到响应（网络问题或服务器未运行）');
      console.error(`   请确保服务器正在运行: npm run dev:server`);
    } else {
      console.error(`   错误: ${error.message}`);
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// 运行测试
testFinalReport();
