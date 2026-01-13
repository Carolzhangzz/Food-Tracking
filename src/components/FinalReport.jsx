import React, { useState, useEffect, useContext } from 'react';
import { PlayerContext } from '../context/PlayerContext';

const FinalReport = ({ onClose }) => {
  const { playerId, playerData } = useContext(PlayerContext);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState(playerData?.language || 'en');
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        // 🔧 终极兼容性请求方案
        let finalUrl = "";
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        
        if (window.location.port === '3000') {
          // 开发环境：强制 3001
          finalUrl = `${protocol}//${hostname}:3001/api/generate-final-report`;
        } else {
          // 生产环境：使用相对路径（Heroku/Vercel 等会自动处理）
          finalUrl = "/api/generate-final-report";
        }
        
        console.log(`📡 [FinalReport] 发送请求: ${finalUrl}`);

        const response = await fetch(finalUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ playerId })
        });
        
        if (!response.ok) throw new Error('Failed to generate report');
        const data = await response.json();
        if (data.success) {
          setReport(data.report);
        } else {
          throw new Error(data.error || 'Unknown error');
        }
      } catch (err) {
        console.error("Report Fetch Error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [playerId]);

  const downloadReport = () => {
    if (!report) return;
    
    const recipeSection = report.recipe ? `
${lang === 'zh' ? '=== 你的专属食谱 ===' : '=== Your Personal Recipe ==='}

${lang === 'zh' ? '前菜' : 'Starter'}: ${report.recipe.starter?.name[lang]}
${lang === 'zh' ? '食材' : 'Ingredients'}: ${report.recipe.starter?.ingredients[lang]}
${lang === 'zh' ? '做法' : 'Method'}: ${report.recipe.starter?.method[lang]}
${lang === 'zh' ? '小贴士' : 'Tip'}: ${report.recipe.starter?.tip[lang]}

${lang === 'zh' ? '主菜' : 'Main Course'}: ${report.recipe.main?.name[lang]}
${lang === 'zh' ? '食材' : 'Ingredients'}: ${report.recipe.main?.ingredients[lang]}
${lang === 'zh' ? '做法' : 'Method'}: ${report.recipe.main?.method[lang]}
${lang === 'zh' ? '小贴士' : 'Tip'}: ${report.recipe.main?.tip[lang]}

${lang === 'zh' ? '配菜' : 'Side Dish'}: ${report.recipe.side?.name[lang]}
${lang === 'zh' ? '食材' : 'Ingredients'}: ${report.recipe.side?.ingredients[lang]}
${lang === 'zh' ? '做法' : 'Method'}: ${report.recipe.side?.method[lang]}
${lang === 'zh' ? '小贴士' : 'Tip'}: ${report.recipe.side?.tip[lang]}

${lang === 'zh' ? '甜点' : 'Dessert'}: ${report.recipe.dessert?.name[lang]}
${lang === 'zh' ? '食材' : 'Ingredients'}: ${report.recipe.dessert?.ingredients[lang]}
${lang === 'zh' ? '做法' : 'Method'}: ${report.recipe.dessert?.method[lang]}
${lang === 'zh' ? '小贴士' : 'Tip'}: ${report.recipe.dessert?.tip[lang]}

${lang === 'zh' ? '饮品' : 'Drink'}: ${report.recipe.drink?.name[lang]}
${lang === 'zh' ? '食材' : 'Ingredients'}: ${report.recipe.drink?.ingredients[lang]}
${lang === 'zh' ? '做法' : 'Method'}: ${report.recipe.drink?.method[lang]}
` : '';

    const content = `
${report.title[lang]}
========================================

${report.mealSummary?.[lang] || ''}

${recipeSection}

${lang === 'zh' ? '=== 健康分析 ===' : '=== Health Analysis ==='}
${report.healthAnalysis?.[lang] || ''}

${lang === 'zh' ? '=== 师父的信 ===' : '=== Letter from Master ==='}
${report.letterFromMaster?.[lang] || ''}

${lang === 'zh' ? '智慧箴言' : 'Wisdom'}:
${report.wisdom[lang]}
    `;
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Chef_Hua_Final_Report_${lang}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div style={overlayStyle}>
        <div style={loaderStyle}>
          <div className="spinner"></div>
          <p>{lang === 'zh' ? '正在撰写师父的回信...' : 'Master is writing the letter...'}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={overlayStyle}>
        <div style={cardStyle}>
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div 
      style={overlayStyle}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      {/* 🎨 飘落的食材特效 */}
      <div className="floating-ingredients">
        <span className="ingredient">🍅</span>
        <span className="ingredient">🥬</span>
        <span className="ingredient">🥕</span>
        <span className="ingredient">🍄</span>
        <span className="ingredient">🌽</span>
        <span className="ingredient">🥦</span>
      </div>

      <div 
        style={cardStyle} 
        className="report-card"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        {/* Decorative Seal with pulse animation */}
        <div style={sealStyle} className="seal-pulse">華</div>
        
        {/* Sparkling stars */}
        <div className="stars">
          <span className="star">✨</span>
          <span className="star">⭐</span>
          <span className="star">✨</span>
        </div>
        
        <h1 style={titleStyle} className="title-rainbow">{report.title[lang]}</h1>
        
        <div style={contentStyle}>
          {/* Meal Summary */}
          {report.mealSummary && (
            <div style={sectionStyle} className="fade-in">
              <p style={summaryStyle}>{report.mealSummary[lang]}</p>
            </div>
          )}

          {/* Recipe Section */}
          {report.recipe && (
            <div style={recipeContainerStyle} className="fade-in-up">
              <h2 style={sectionTitleStyle} className="section-title-bounce">
                {lang === 'zh' ? '🍽️ 你的专属食谱' : '🍽️ Your Personal Recipe'}
              </h2>
              <p style={recipeIntroStyle}>{report.recipe.intro?.[lang]}</p>
              
              {/* Recipe Cards with hover effects */}
              {report.recipe.starter && (
                <div style={dishStyle} className="dish-card dish-hover">
                  <div className="dish-icon">🥗</div>
                  <h3 style={dishTitleStyle}>{report.recipe.starter.name[lang]}</h3>
                  <p><strong>{lang === 'zh' ? '食材' : 'Ingredients'}:</strong> {report.recipe.starter.ingredients[lang]}</p>
                  <p><strong>{lang === 'zh' ? '做法' : 'Method'}:</strong> {report.recipe.starter.method[lang]}</p>
                  <p style={tipStyle}>💡 {report.recipe.starter.tip[lang]}</p>
                </div>
              )}
              
              {report.recipe.main && (
                <div style={dishStyle} className="dish-card dish-hover">
                  <div className="dish-icon">🍚</div>
                  <h3 style={dishTitleStyle}>{report.recipe.main.name[lang]}</h3>
                  <p><strong>{lang === 'zh' ? '食材' : 'Ingredients'}:</strong> {report.recipe.main.ingredients[lang]}</p>
                  <p><strong>{lang === 'zh' ? '做法' : 'Method'}:</strong> {report.recipe.main.method[lang]}</p>
                  <p style={tipStyle}>💡 {report.recipe.main.tip[lang]}</p>
                </div>
              )}
              
              {report.recipe.side && (
                <div style={dishStyle} className="dish-card dish-hover">
                  <div className="dish-icon">🥦</div>
                  <h3 style={dishTitleStyle}>{report.recipe.side.name[lang]}</h3>
                  <p><strong>{lang === 'zh' ? '食材' : 'Ingredients'}:</strong> {report.recipe.side.ingredients[lang]}</p>
                  <p><strong>{lang === 'zh' ? '做法' : 'Method'}:</strong> {report.recipe.side.method[lang]}</p>
                  <p style={tipStyle}>💡 {report.recipe.side.tip[lang]}</p>
                </div>
              )}
              
              {report.recipe.dessert && (
                <div style={dishStyle} className="dish-card dish-hover">
                  <div className="dish-icon">🍨</div>
                  <h3 style={dishTitleStyle}>{report.recipe.dessert.name[lang]}</h3>
                  <p><strong>{lang === 'zh' ? '食材' : 'Ingredients'}:</strong> {report.recipe.dessert.ingredients[lang]}</p>
                  <p><strong>{lang === 'zh' ? '做法' : 'Method'}:</strong> {report.recipe.dessert.method[lang]}</p>
                  <p style={tipStyle}>💡 {report.recipe.dessert.tip[lang]}</p>
                </div>
              )}
              
              {report.recipe.drink && (
                <div style={dishStyle} className="dish-card dish-hover">
                  <div className="dish-icon">🍵</div>
                  <h3 style={dishTitleStyle}>{report.recipe.drink.name[lang]}</h3>
                  <p><strong>{lang === 'zh' ? '食材' : 'Ingredients'}:</strong> {report.recipe.drink.ingredients[lang]}</p>
                  <p><strong>{lang === 'zh' ? '做法' : 'Method'}:</strong> {report.recipe.drink.method[lang]}</p>
                </div>
              )}
            </div>
          )}

          {/* Health Analysis */}
          {report.healthAnalysis && (
            <div style={healthBoxStyle} className="fade-in-up health-pulse">
              <h2 style={sectionTitleStyle} className="section-title-bounce">
                {lang === 'zh' ? '🌱 健康分析' : '🌱 Health Analysis'}
              </h2>
              <p style={bodyStyle}>{report.healthAnalysis[lang]}</p>
            </div>
          )}

          {/* Letter from Master */}
          {report.letterFromMaster && (
            <div style={letterBoxStyle} className="fade-in-up letter-glow">
              <h2 style={sectionTitleStyle} className="section-title-bounce">
                {lang === 'zh' ? '💌 师父的信' : '💌 Letter from Master'}
              </h2>
              <p style={bodyStyle}>{report.letterFromMaster[lang]}</p>
            </div>
          )}
          
          {/* Wisdom */}
          <div style={wisdomBoxStyle} className="wisdom-shine">
            <h3 style={{ marginTop: 0, color: '#fbbf24', textShadow: '0 0 10px rgba(251, 191, 36, 0.3)' }}>
              {lang === 'zh' ? '💡 厨师的智慧' : '💡 Chef\'s Wisdom'}
            </h3>
            <p className="wisdom-text">{report.wisdom[lang]}</p>
          </div>
        </div>

        <div style={footerStyle}>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setLang(lang === 'zh' ? 'en' : 'zh');
            }} 
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            style={btnSecondaryStyle} 
            className="btn-bounce"
          >
            🌐 {lang === 'zh' ? 'English' : '中文'}
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              downloadReport();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            style={btnPrimaryStyle} 
            className="btn-bounce"
          >
            📂 {lang === 'zh' ? '下载完整报告' : 'Download Full Report'}
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onClose();
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            style={btnDangerStyle} 
            className="btn-bounce"
          >
            🏁 {lang === 'zh' ? '结束旅程' : 'End Journey'}
          </button>
        </div>
      </div>

      <style>{`
        /* 🎨 Loading Spinner */
        .spinner {
          width: 50px;
          height: 50px;
          border: 5px solid rgba(255,255,255,0.1);
          border-top-color: #fbbf24;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }
        @keyframes spin { 
          to { transform: rotate(360deg); } 
        }

        /* 🎨 飘落的食材特效 */
        .floating-ingredients {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 10000;
          overflow: hidden;
        }
        .ingredient {
          position: absolute;
          font-size: 2rem;
          opacity: 0.6;
          animation: float-down 15s infinite;
        }
        .ingredient:nth-child(1) { left: 10%; animation-delay: 0s; animation-duration: 12s; }
        .ingredient:nth-child(2) { left: 25%; animation-delay: 2s; animation-duration: 15s; }
        .ingredient:nth-child(3) { left: 45%; animation-delay: 4s; animation-duration: 18s; }
        .ingredient:nth-child(4) { left: 60%; animation-delay: 1s; animation-duration: 14s; }
        .ingredient:nth-child(5) { left: 75%; animation-delay: 3s; animation-duration: 16s; }
        .ingredient:nth-child(6) { left: 90%; animation-delay: 5s; animation-duration: 13s; }

        @keyframes float-down {
          0% { 
            transform: translateY(-100px) rotate(0deg); 
            opacity: 0;
          }
          10% { opacity: 0.6; }
          90% { opacity: 0.6; }
          100% { 
            transform: translateY(100vh) rotate(360deg); 
            opacity: 0;
          }
        }

        /* 🎨 报告卡片进场动画 */
        .report-card {
          animation: slide-in-up 0.8s ease-out;
        }
        @keyframes slide-in-up {
          from {
            opacity: 0;
            transform: translateY(50px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* 🎨 印章脉冲动画 */
        .seal-pulse {
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { transform: rotate(-15deg) scale(1); }
          50% { transform: rotate(-15deg) scale(1.1); }
        }

        /* 🎨 闪烁的星星 */
        .stars {
          position: absolute;
          top: 20px;
          left: 20px;
          z-index: 1;
        }
        .star {
          display: inline-block;
          margin: 0 5px;
          animation: twinkle 2s ease-in-out infinite;
        }
        .star:nth-child(1) { animation-delay: 0s; }
        .star:nth-child(2) { animation-delay: 0.7s; }
        .star:nth-child(3) { animation-delay: 1.4s; }

        @keyframes twinkle {
          0%, 100% { opacity: 1; transform: scale(1) rotate(0deg); }
          50% { opacity: 0.3; transform: scale(1.3) rotate(180deg); }
        }

        /* 🎨 彩虹标题效果 */
        .title-rainbow {
          background: linear-gradient(90deg, #ff6b6b, #f59e42, #fbbf24, #10b981, #3b82f6, #8b5cf6);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: rainbow-flow 3s linear infinite;
        }
        @keyframes rainbow-flow {
          to { background-position: 200% center; }
        }

        /* 🎨 淡入动画 */
        .fade-in {
          animation: fade-in 0.8s ease-out;
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .fade-in-up {
          animation: fade-in-up 0.8s ease-out backwards;
        }
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* 🎨 章节标题弹跳 */
        .section-title-bounce {
          animation: bounce-in 0.6s ease-out;
        }
        @keyframes bounce-in {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }

        /* 🎨 菜品卡片图标 */
        .dish-icon {
          font-size: 3rem;
          text-align: center;
          margin-bottom: 10px;
          animation: rotate-in 0.6s ease-out;
        }
        @keyframes rotate-in {
          from { transform: rotate(-180deg) scale(0); }
          to { transform: rotate(0deg) scale(1); }
        }

        /* 🎨 菜品卡片悬停效果 */
        .dish-card {
          transition: all 0.3s ease;
        }
        .dish-hover:hover {
          transform: translateY(-5px) scale(1.02);
          box-shadow: 0 10px 30px rgba(202, 138, 4, 0.3);
        }

        /* 🎨 健康分析脉冲 */
        .health-pulse {
          animation: health-pulse 3s ease-in-out infinite;
        }
        @keyframes health-pulse {
          0%, 100% { box-shadow: 0 0 0 rgba(16, 163, 74, 0.4); }
          50% { box-shadow: 0 0 20px rgba(16, 163, 74, 0.8); }
        }

        /* 🎨 师父的信发光效果 */
        .letter-glow {
          animation: letter-glow 4s ease-in-out infinite;
        }
        @keyframes letter-glow {
          0%, 100% { box-shadow: 0 0 0 rgba(220, 38, 38, 0.3); }
          50% { box-shadow: 0 0 25px rgba(220, 38, 38, 0.6); }
        }

        /* 🎨 智慧闪光效果 */
        .wisdom-shine {
          position: relative;
          overflow: hidden;
        }
        .wisdom-shine::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: shine 3s infinite;
        }
        @keyframes shine {
          to { left: 100%; }
        }

        .wisdom-text {
          font-style: italic;
          font-size: 1.15rem;
          font-weight: 600;
          color: #fbbf24;  /* 🎮 金色文字 */
          text-shadow: 0 0 10px rgba(251, 191, 36, 0.3);
        }

        /* 🎨 按钮弹跳交互 */
        .btn-bounce {
          transition: all 0.2s ease;
        }
        .btn-bounce:hover {
          transform: translateY(-3px);
          box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        }
        .btn-bounce:active {
          transform: translateY(0);
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        }

        /* 🎨 延迟动画（错开显示） */
        .fade-in-up:nth-of-type(2) { animation-delay: 0.1s; }
        .fade-in-up:nth-of-type(3) { animation-delay: 0.2s; }
        .fade-in-up:nth-of-type(4) { animation-delay: 0.3s; }
        .dish-card:nth-of-type(1) { animation-delay: 0.1s; }
        .dish-card:nth-of-type(2) { animation-delay: 0.2s; }
        .dish-card:nth-of-type(3) { animation-delay: 0.3s; }
        .dish-card:nth-of-type(4) { animation-delay: 0.4s; }
        .dish-card:nth-of-type(5) { animation-delay: 0.5s; }
      `}</style>
    </div>
  );
};

// Styles
const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: 'rgba(15, 15, 35, 0.95)',  // 🎮 游戏深色背景（加深避免穿透）
  backdropFilter: 'blur(20px)',  // 🔧 加强模糊效果
  zIndex: 999999,  // 🔧 超高z-index，完全覆盖所有元素
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '20px',
  fontFamily: '"Georgia", serif',
  pointerEvents: 'auto',  // 🔧 确保捕获所有点击事件
  isolation: 'isolate',  // 🔧 创建新的堆叠上下文
};

const cardStyle = {
  backgroundColor: '#1a1a2e',  // 🎮 游戏深色基调
  backgroundImage: `
    linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%),
    url("https://www.transparenttextures.com/patterns/stardust.png")
  `,
  width: '100%',
  maxWidth: '750px',
  maxHeight: '90vh',
  padding: '50px',
  borderRadius: '20px',
  boxShadow: '0 30px 70px rgba(102, 126, 234, 0.4), 0 0 50px rgba(118, 75, 162, 0.3)',
  position: 'relative',
  overflowY: 'auto',
  border: '3px solid rgba(102, 126, 234, 0.6)',  // 🎮 紫蓝色边框
  scrollbarWidth: 'thin',
  scrollbarColor: '#667eea #2d3748',
  color: '#e2e8f0',  // 浅色文字
};

const sealStyle = {
  position: 'absolute',
  top: '30px',
  right: '40px',
  width: '60px',
  height: '60px',
  border: '3px solid #f59e0b',  // 🎮 金色印章
  borderRadius: '50%',
  color: '#f59e0b',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  fontSize: '30px',
  fontWeight: 'bold',
  opacity: 0.9,
  transform: 'rotate(-15deg)',
  background: 'rgba(245, 158, 11, 0.1)',
};

const titleStyle = {
  textAlign: 'center',
  color: '#f0abfc',  // 🎮 明亮的紫色
  fontSize: '2.5rem',
  marginBottom: '30px',
  borderBottom: '2px solid rgba(102, 126, 234, 0.5)',
  paddingBottom: '10px',
  textShadow: '0 0 20px rgba(240, 171, 252, 0.5)',
};

const contentStyle = {
  lineHeight: '1.8',
  color: '#cbd5e1',  // 🎮 柔和的浅灰色文字
  fontSize: '1.1rem',
};

const bodyStyle = {
  whiteSpace: 'pre-wrap',
  marginBottom: '20px',
  lineHeight: '1.8',
  color: '#e2e8f0',
};

const sectionStyle = {
  marginBottom: '30px',
};

const summaryStyle = {
  fontStyle: 'italic',
  fontSize: '1.05rem',
  textAlign: 'center',
  padding: '15px',
  backgroundColor: 'rgba(102, 126, 234, 0.15)',  // 🎮 紫色背景
  borderRadius: '12px',
  border: '1px solid rgba(102, 126, 234, 0.3)',
  color: '#e0e7ff',
};

const sectionTitleStyle = {
  color: '#a78bfa',  // 🎮 明亮的紫色
  fontSize: '1.8rem',
  marginBottom: '15px',
  marginTop: '30px',
  borderBottom: '2px solid rgba(167, 139, 250, 0.4)',
  paddingBottom: '8px',
  textShadow: '0 0 10px rgba(167, 139, 250, 0.3)',
};

const recipeContainerStyle = {
  marginBottom: '40px',
};

const recipeIntroStyle = {
  fontStyle: 'italic',
  marginBottom: '20px',
  fontSize: '1.05rem',
};

const dishStyle = {
  backgroundColor: 'rgba(30, 41, 59, 0.6)',  // 🎮 深色半透明背景
  padding: '25px',
  borderRadius: '15px',
  marginBottom: '20px',
  borderLeft: '5px solid #8b5cf6',  // 🎮 紫色左边框
  boxShadow: '0 4px 15px rgba(139, 92, 246, 0.2)',
  backdropFilter: 'blur(10px)',
  border: '1px solid rgba(139, 92, 246, 0.3)',
};

const dishTitleStyle = {
  color: '#c4b5fd',  // 🎮 亮紫色标题
  fontSize: '1.3rem',
  marginTop: 0,
  marginBottom: '12px',
};

const tipStyle = {
  fontStyle: 'italic',
  color: '#fbbf24',  // 🎮 金色提示
  marginTop: '10px',
  fontSize: '0.95rem',
};

const healthBoxStyle = {
  backgroundColor: 'rgba(5, 150, 105, 0.15)',  // 🎮 绿色半透明
  padding: '25px',
  borderRadius: '15px',
  borderLeft: '5px solid #10b981',
  marginBottom: '30px',
  border: '1px solid rgba(16, 185, 129, 0.3)',
  boxShadow: '0 4px 15px rgba(16, 185, 129, 0.2)',
};

const letterBoxStyle = {
  backgroundColor: 'rgba(59, 130, 246, 0.15)',  // 🎮 蓝色半透明
  padding: '25px',
  borderRadius: '15px',
  borderLeft: '5px solid #3b82f6',
  marginBottom: '30px',
  border: '1px solid rgba(59, 130, 246, 0.3)',
  boxShadow: '0 4px 15px rgba(59, 130, 246, 0.2)',
};

const wisdomBoxStyle = {
  backgroundColor: 'rgba(245, 158, 11, 0.15)',  // 🎮 金色半透明
  padding: '20px',
  borderRadius: '12px',
  borderLeft: '4px solid #f59e0b',
  marginBottom: '30px',
  fontStyle: 'italic',
  border: '1px solid rgba(245, 158, 11, 0.3)',
  boxShadow: '0 4px 15px rgba(245, 158, 11, 0.2)',
};

const signatureStyle = {
  textAlign: 'right',
  fontSize: '1.3rem',
  fontWeight: 'bold',
  marginTop: '40px',
};

const footerStyle = {
  display: 'flex',
  justifyContent: 'center',
  gap: '15px',
  marginTop: '40px',
  flexWrap: 'wrap',
};

const btnBase = {
  padding: '12px 24px',
  borderRadius: '8px',
  border: 'none',
  cursor: 'pointer',
  fontWeight: 'bold',
  transition: 'all 0.2s',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
};

const btnPrimaryStyle = { 
  ...btnBase, 
  backgroundColor: '#667eea',  // 🎮 紫蓝色
  color: 'white',
  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
};

const btnSecondaryStyle = { 
  ...btnBase, 
  backgroundColor: '#374151',  // 🎮 深灰色
  color: '#e2e8f0',
  border: '1px solid rgba(102, 126, 234, 0.3)',
};

const btnDangerStyle = { 
  ...btnBase, 
  backgroundColor: '#764ba2',  // 🎮 深紫色
  color: 'white',
  boxShadow: '0 4px 15px rgba(118, 75, 162, 0.4)',
};

const loaderStyle = {
  textAlign: 'center',
  color: 'white',
};

export default FinalReport;

