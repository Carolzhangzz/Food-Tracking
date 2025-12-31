const axios = require('axios');

async function test() {
  console.log('🚀 正在本地测试报告生成接口...');
  try {
    const response = await axios.post('http://127.0.0.1:3001/api/generate-final-report', {
      playerId: '002'
    });
    console.log('✅ 接口响应成功！');
    console.log('📄 报告内容摘要:', JSON.stringify(response.data.report).substring(0, 100) + '...');
  } catch (error) {
    console.error('❌ 接口测试失败');
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('错误数据:', error.response.data);
    } else {
      console.error('错误消息:', error.message);
    }
    console.log('\n💡 提示: 请确保您的后端服务器正在运行且监听 3001 端口。');
  }
}

test();
