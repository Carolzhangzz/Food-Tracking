// server/scripts/testConnection.js - 测试 PostgreSQL 连接
require('dotenv').config();
const sequelize = require('../db');

async function testConnection() {
  try {
    console.log('🔗 正在测试 PostgreSQL 连接...');
    console.log('📋 数据库配置:');
    console.log('  - Host:', process.env.DB_HOST || 'localhost');
    console.log('  - Port:', process.env.DB_PORT || 5432);
    console.log('  - Database:', process.env.DB_NAME || 'rpg_game_db');
    console.log('  - User:', process.env.DB_USER || 'postgres');
    console.log('  - Password:', process.env.DB_PASS ? '***' : '未设置');

    // 测试连接
    await sequelize.authenticate();
    console.log('✅ PostgreSQL 连接成功！');

    // 获取数据库版本
    const [results] = await sequelize.query('SELECT version();');
    console.log('📊 PostgreSQL 版本:', results[0].version);

    // 列出现有的表
    const tables = await sequelize.getQueryInterface().showAllTables();
    console.log('📋 现有表:', tables.length > 0 ? tables : '无');

    // 测试创建一个简单表
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS test_table (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await sequelize.query(`
      INSERT INTO test_table (name) VALUES ('test_connection') 
      ON CONFLICT DO NOTHING;
    `);

    const [testResults] = await sequelize.query('SELECT * FROM test_table LIMIT 1;');
    console.log('🧪 测试数据:', testResults[0]);

    // 清理测试表
    await sequelize.query('DROP TABLE IF EXISTS test_table;');
    console.log('🧹 清理测试数据完成');

    console.log('🎉 所有测试通过！数据库连接正常。');

  } catch (error) {
    console.error('❌ 数据库连接失败:');
    console.error('错误类型:', error.name);
    console.error('错误信息:', error.message);

    if (error.code) {
      console.error('错误代码:', error.code);
    }

    // 常见错误的解决建议
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 建议检查:');
      console.log('  1. PostgreSQL 服务是否正在运行');
      console.log('  2. 端口号是否正确（默认5432）');
      console.log('  3. 主机地址是否正确');
    } else if (error.message.includes('password authentication failed')) {
      console.log('\n💡 建议检查:');
      console.log('  1. 用户名和密码是否正确');
      console.log('  2. .env 文件中的配置是否正确');
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.log('\n💡 建议:');
      console.log('  需要先创建数据库:');
      console.log('  psql -U postgres -c "CREATE DATABASE rpg_game_db;"');
    }

  } finally {
    await sequelize.close();
    console.log('🔌 数据库连接已关闭');
  }
}

console.log('🚀 开始 PostgreSQL 连接测试...');
testConnection();