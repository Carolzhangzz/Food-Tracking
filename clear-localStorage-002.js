// 在浏览器控制台运行此脚本，清空玩家002的所有本地数据

console.log('🧹 开始清理玩家002的localStorage数据...\n');

let count = 0;
Object.keys(localStorage).forEach(key => {
  if (key.includes('002')) {
    console.log(`🗑️  删除: ${key}`);
    localStorage.removeItem(key);
    count++;
  }
});

if (count === 0) {
  console.log('✅ 没有找到玩家002的数据');
} else {
  console.log(`\n✅ 成功删除 ${count} 条记录`);
}

console.log('\n💡 提示：刷新页面后生效');

