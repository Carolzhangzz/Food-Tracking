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
              
              {/* Recipe Cards with detailed info */}
              {report.recipe.starter && (
                <div style={dishStyle} className="dish-card dish-hover">
                  <div className="dish-icon">🥗</div>
                  <h3 style={dishTitleStyle}>{report.recipe.starter.name[lang]}</h3>
                  {report.recipe.starter.calories && (
                    <p style={calorieStyle}>🔥 {report.recipe.starter.calories}</p>
                  )}
                  <p><strong>{lang === 'zh' ? '食材' : 'Ingredients'}:</strong> {report.recipe.starter.ingredients[lang]}</p>
                  {report.recipe.starter.cookingTime && (
                    <p><strong>⏱️ {lang === 'zh' ? '烹饪时间' : 'Time'}:</strong> {report.recipe.starter.cookingTime[lang]}</p>
                  )}
                  {report.recipe.starter.steps && (
                    <div style={{marginTop: '12px'}}>
                      <strong>{lang === 'zh' ? '做法' : 'Steps'}:</strong>
                      <ol style={{marginLeft: '20px', marginTop: '8px'}}>
                        {(report.recipe.starter.steps[lang] || []).map((step, i) => (
                          <li key={i} style={{marginBottom: '6px'}}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {report.recipe.starter.tip && (
                    <p style={tipStyle}>💡 {report.recipe.starter.tip[lang]}</p>
                  )}
                </div>
              )}
              
              {report.recipe.main && (
                <div style={dishStyle} className="dish-card dish-hover">
                  <div className="dish-icon">🍚</div>
                  <h3 style={dishTitleStyle}>{report.recipe.main.name[lang]}</h3>
                  {report.recipe.main.calories && (
                    <p style={calorieStyle}>🔥 {report.recipe.main.calories}</p>
                  )}
                  <p><strong>{lang === 'zh' ? '食材' : 'Ingredients'}:</strong> {report.recipe.main.ingredients[lang]}</p>
                  {report.recipe.main.cookingTime && (
                    <p><strong>⏱️ {lang === 'zh' ? '烹饪时间' : 'Time'}:</strong> {report.recipe.main.cookingTime[lang]}</p>
                  )}
                  {report.recipe.main.steps && (
                    <div style={{marginTop: '12px'}}>
                      <strong>{lang === 'zh' ? '做法' : 'Steps'}:</strong>
                      <ol style={{marginLeft: '20px', marginTop: '8px'}}>
                        {(report.recipe.main.steps[lang] || []).map((step, i) => (
                          <li key={i} style={{marginBottom: '6px'}}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {report.recipe.main.tip && (
                    <p style={tipStyle}>💡 {report.recipe.main.tip[lang]}</p>
                  )}
                </div>
              )}
              
              {report.recipe.side && (
                <div style={dishStyle} className="dish-card dish-hover">
                  <div className="dish-icon">🥦</div>
                  <h3 style={dishTitleStyle}>{report.recipe.side.name[lang]}</h3>
                  {report.recipe.side.calories && (
                    <p style={calorieStyle}>🔥 {report.recipe.side.calories}</p>
                  )}
                  <p><strong>{lang === 'zh' ? '食材' : 'Ingredients'}:</strong> {report.recipe.side.ingredients[lang]}</p>
                  {report.recipe.side.cookingTime && (
                    <p><strong>⏱️ {lang === 'zh' ? '烹饪时间' : 'Time'}:</strong> {report.recipe.side.cookingTime[lang]}</p>
                  )}
                  {report.recipe.side.steps && (
                    <div style={{marginTop: '12px'}}>
                      <strong>{lang === 'zh' ? '做法' : 'Steps'}:</strong>
                      <ol style={{marginLeft: '20px', marginTop: '8px'}}>
                        {(report.recipe.side.steps[lang] || []).map((step, i) => (
                          <li key={i} style={{marginBottom: '6px'}}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {report.recipe.side.tip && (
                    <p style={tipStyle}>💡 {report.recipe.side.tip[lang]}</p>
                  )}
                </div>
              )}
              
              {report.recipe.dessert && (
                <div style={dishStyle} className="dish-card dish-hover">
                  <div className="dish-icon">🍨</div>
                  <h3 style={dishTitleStyle}>{report.recipe.dessert.name[lang]}</h3>
                  {report.recipe.dessert.calories && (
                    <p style={calorieStyle}>🔥 {report.recipe.dessert.calories}</p>
                  )}
                  <p><strong>{lang === 'zh' ? '食材' : 'Ingredients'}:</strong> {report.recipe.dessert.ingredients[lang]}</p>
                  {report.recipe.dessert.cookingTime && (
                    <p><strong>⏱️ {lang === 'zh' ? '烹饪时间' : 'Time'}:</strong> {report.recipe.dessert.cookingTime[lang]}</p>
                  )}
                  {report.recipe.dessert.steps && (
                    <div style={{marginTop: '12px'}}>
                      <strong>{lang === 'zh' ? '做法' : 'Steps'}:</strong>
                      <ol style={{marginLeft: '20px', marginTop: '8px'}}>
                        {(report.recipe.dessert.steps[lang] || []).map((step, i) => (
                          <li key={i} style={{marginBottom: '6px'}}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {report.recipe.dessert.tip && (
                    <p style={tipStyle}>💡 {report.recipe.dessert.tip[lang]}</p>
                  )}
                </div>
              )}
              
              {report.recipe.drink && (
                <div style={dishStyle} className="dish-card dish-hover">
                  <div className="dish-icon">🍵</div>
                  <h3 style={dishTitleStyle}>{report.recipe.drink.name[lang]}</h3>
                  {report.recipe.drink.calories && (
                    <p style={calorieStyle}>🔥 {report.recipe.drink.calories}</p>
                  )}
                  <p><strong>{lang === 'zh' ? '食材' : 'Ingredients'}:</strong> {report.recipe.drink.ingredients[lang]}</p>
                  {report.recipe.drink.cookingTime && (
                    <p><strong>⏱️ {lang === 'zh' ? '烹饪时间' : 'Time'}:</strong> {report.recipe.drink.cookingTime[lang]}</p>
                  )}
                  {report.recipe.drink.steps && (
                    <div style={{marginTop: '12px'}}>
                      <strong>{lang === 'zh' ? '做法' : 'Steps'}:</strong>
                      <ol style={{marginLeft: '20px', marginTop: '8px'}}>
                        {(report.recipe.drink.steps[lang] || []).map((step, i) => (
                          <li key={i} style={{marginBottom: '6px'}}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Professional Nutrition Analysis */}
          {report.nutritionAnalysis && (
            <div style={healthBoxStyle} className="fade-in-up health-pulse">
              <h2 style={sectionTitleStyle} className="section-title-bounce">
                {lang === 'zh' ? '🩺 专业营养分析' : '🩺 Professional Nutrition Analysis'}
              </h2>
              
              {/* Protein */}
              {report.nutritionAnalysis.protein && (
                <div style={{marginBottom: '20px', borderBottom: '1px dashed #a0522d', paddingBottom: '15px'}}>
                  <h3 style={{color: '#8b4513', fontSize: '1.2rem', marginBottom: '8px'}}>
                    💪 {lang === 'zh' ? '蛋白质' : 'Protein'}
                  </h3>
                  <p style={{...bodyStyle, marginTop: '8px'}}>{report.nutritionAnalysis.protein[lang]}</p>
                </div>
              )}
              
              {/* Carbohydrates */}
              {report.nutritionAnalysis.carbohydrates && (
                <div style={{marginBottom: '20px', borderBottom: '1px dashed #a0522d', paddingBottom: '15px'}}>
                  <h3 style={{color: '#8b4513', fontSize: '1.2rem', marginBottom: '8px'}}>
                    🌾 {lang === 'zh' ? '碳水化合物' : 'Carbohydrates'}
                  </h3>
                  <p style={{...bodyStyle, marginTop: '8px'}}>{report.nutritionAnalysis.carbohydrates[lang]}</p>
                </div>
              )}
              
              {/* Fiber */}
              {report.nutritionAnalysis.fiber && (
                <div style={{marginBottom: '20px', borderBottom: '1px dashed #a0522d', paddingBottom: '15px'}}>
                  <h3 style={{color: '#8b4513', fontSize: '1.2rem', marginBottom: '8px'}}>
                    🥬 {lang === 'zh' ? '膳食纤维' : 'Dietary Fiber'}
                  </h3>
                  <p style={{...bodyStyle, marginTop: '8px'}}>{report.nutritionAnalysis.fiber[lang]}</p>
                </div>
              )}
              
              {/* Fats */}
              {report.nutritionAnalysis.fats && (
                <div style={{marginBottom: '20px', borderBottom: '1px dashed #a0522d', paddingBottom: '15px'}}>
                  <h3 style={{color: '#8b4513', fontSize: '1.2rem', marginBottom: '8px'}}>
                    🥑 {lang === 'zh' ? '脂肪' : 'Fats'}
                  </h3>
                  <p style={{...bodyStyle, marginTop: '8px'}}>{report.nutritionAnalysis.fats[lang]}</p>
                </div>
              )}
              
              {/* Overall */}
              {report.nutritionAnalysis.overall && (
                <div style={{marginTop: '25px', paddingTop: '20px', borderTop: '2px solid #a0522d'}}>
                  <h3 style={{color: '#8b4513', fontSize: '1.2rem', marginBottom: '8px'}}>
                    📋 {lang === 'zh' ? '整体建议' : 'Overall Recommendations'}
                  </h3>
                  <p style={{...bodyStyle, marginTop: '8px'}}>{report.nutritionAnalysis.overall[lang]}</p>
                </div>
              )}
            </div>
          )}
          
          {/* Fallback to old healthAnalysis if nutritionAnalysis not available */}
          {!report.nutritionAnalysis && report.healthAnalysis && (
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

// Styles - 📜 古典卷轴风格
// 🔧 检测是否是移动设备（必须在样式定义之前）
const isMobile = window.innerWidth <= 768;

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: 'rgba(20, 15, 10, 0.92)',  // 📜 深棕色背景，营造古典氛围
  backdropFilter: isMobile ? 'none' : 'blur(15px)',  // 🔧 移动端关闭blur以提高性能
  WebkitBackdropFilter: isMobile ? 'none' : 'blur(15px)',  // 🔧 iOS支持
  zIndex: 999999,
  display: 'flex',
  justifyContent: 'center',
  alignItems: isMobile ? 'flex-start' : 'center',  // 🔧 移动端从顶部开始
  padding: isMobile ? '10px' : '20px',
  fontFamily: '"Crimson Text", "Georgia", "Times New Roman", serif',  // 📜 古典字体
  pointerEvents: 'auto',
  isolation: 'isolate',
  overflowY: 'auto',  // 🔧 允许整个overlay滚动
  WebkitOverflowScrolling: 'touch',  // 🔧 iOS平滑滚动
};

const cardStyle = {
  backgroundColor: '#f4e8d0',  // 📜 羊皮纸米黄色
  backgroundImage: `
    linear-gradient(to bottom, rgba(244, 232, 208, 0.9), rgba(230, 210, 180, 0.95)),
    url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c9a875' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")
  `,  // 📜 古典纹理
  width: '100%',
  maxWidth: isMobile ? '100%' : '820px',
  maxHeight: '88vh',
  padding: isMobile ? '30px 20px' : '60px 50px',  // 🔧 移动端减少padding
  borderRadius: '8px',  // 📜 轻微圆角
  boxShadow: isMobile 
    ? '0 10px 40px rgba(0, 0, 0, 0.5)'  // 🔧 移动端简化阴影，避免渲染问题
    : `
      0 0 0 8px #e6d2b4,
      0 0 0 12px #d4b896,
      0 0 0 16px #c9a875,
      inset 0 0 80px rgba(193, 154, 107, 0.15),
      0 30px 90px rgba(0, 0, 0, 0.5),
      0 0 60px rgba(212, 184, 150, 0.3)
    `,  // 📜 多层边框 + 内阴影营造卷轴感
  position: 'relative',
  overflowY: 'auto',
  overflowX: 'hidden',  // 🔧 防止横向滚动
  border: '2px solid #c19a6b',  // 📜 古铜色边框
  scrollbarWidth: 'thin',
  scrollbarColor: '#8b6f47 transparent',
  color: '#2c1810',  // 📜 深棕色墨水文字
  backgroundBlendMode: 'multiply',
  WebkitOverflowScrolling: 'touch',  // 🔧 iOS平滑滚动
};

const sealStyle = {
  position: 'absolute',
  top: '30px',
  right: '40px',
  width: '70px',
  height: '70px',
  border: '4px solid #8b4513',  // 📜 深棕色蜡封边框
  borderRadius: '50%',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  fontSize: '32px',
  fontWeight: 'bold',
  opacity: 0.85,
  transform: 'rotate(-12deg)',
  background: `
    radial-gradient(circle, #c41e3a 0%, #8b1e3f 70%, #5c0f28 100%)
  `,  // 📜 红色蜡封效果
  boxShadow: `
    inset 0 0 20px rgba(0, 0, 0, 0.4),
    0 3px 10px rgba(0, 0, 0, 0.5)
  `,
  color: '#ffd700',  // 📜 金色字
  textShadow: '1px 1px 3px rgba(0, 0, 0, 0.6)',
};

const titleStyle = {
  textAlign: 'center',
  color: '#5c3317',  // 📜 深棕色标题
  fontSize: isMobile ? '1.8rem' : '2.8rem',  // 🔧 移动端缩小字体
  marginBottom: isMobile ? '20px' : '30px',
  fontFamily: '"Cinzel Decorative", "Georgia", serif',  // 📜 装饰性字体
  borderBottom: '3px double #8b6f47',  // 📜 双线边框
  paddingBottom: '15px',
  textShadow: '1px 1px 2px rgba(139, 111, 71, 0.3)',
  letterSpacing: isMobile ? '1px' : '2px',  // 🔧 移动端减少字间距
  fontWeight: '600',
  wordBreak: 'break-word',  // 🔧 防止标题超出屏幕
};

const contentStyle = {
  lineHeight: '1.9',
  color: '#3e2723',  // 📜 深棕色墨水
  fontSize: '1.08rem',
  textAlign: 'justify',  // 📜 两端对齐，更像信件
};

const bodyStyle = {
  whiteSpace: 'pre-wrap',
  marginBottom: '20px',
  lineHeight: '1.9',
  color: '#3e2723',
  textShadow: '0.5px 0.5px 1px rgba(0, 0, 0, 0.08)',  // 📜 轻微墨迹感
};

const sectionStyle = {
  marginBottom: '30px',
};

const summaryStyle = {
  fontStyle: 'italic',
  fontSize: '1.1rem',
  textAlign: 'center',
  padding: '20px',
  backgroundColor: 'rgba(139, 111, 71, 0.08)',  // 📜 淡棕色背景
  borderRadius: '6px',
  border: '2px solid #c9a875',
  borderStyle: 'solid',
  color: '#4a3520',
  boxShadow: 'inset 0 2px 8px rgba(139, 111, 71, 0.1)',
};

const sectionTitleStyle = {
  color: '#6d4c3d',  // 📜 深棕色标题
  fontSize: '1.9rem',
  marginBottom: '18px',
  marginTop: '35px',
  borderBottom: '2px solid #8b6f47',
  paddingBottom: '10px',
  fontFamily: '"Cinzel", "Georgia", serif',
  letterSpacing: '1px',
  textTransform: 'uppercase',
  fontWeight: '600',
};

const recipeContainerStyle = {
  marginBottom: '40px',
};

const recipeIntroStyle = {
  fontStyle: 'italic',
  marginBottom: '25px',
  fontSize: '1.08rem',
  color: '#4a3520',
  textAlign: 'center',
};

const dishStyle = {
  backgroundColor: 'rgba(233, 216, 191, 0.4)',  // 📜 淡羊皮纸色
  padding: '25px',
  borderRadius: '8px',
  marginBottom: '22px',
  borderLeft: '5px solid #8b6f47',  // 📜 古铜色左边框
  borderRight: '5px solid #8b6f47',
  boxShadow: `
    inset 0 0 20px rgba(139, 111, 71, 0.08),
    0 3px 12px rgba(92, 51, 23, 0.15)
  `,
  border: '1px solid #c9a875',
  backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23c9a875\' fill-opacity=\'0.05\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'3\'/%3E%3Ccircle cx=\'13\' cy=\'13\' r=\'3\'/%3E%3C/g%3E%3C/svg%3E")',
};

const dishTitleStyle = {
  color: '#5c3317',  // 📜 深棕色标题
  fontSize: '1.35rem',
  marginTop: 0,
  marginBottom: '15px',
  fontFamily: '"Cinzel", "Georgia", serif',
  borderBottom: '1px solid #c9a875',
  paddingBottom: '8px',
  fontWeight: '600',
};

const calorieStyle = {
  fontSize: '0.95rem',
  color: '#d2691e',  // 📜 巧克力色
  fontWeight: 'bold',
  marginTop: '8px',
  marginBottom: '8px',
  padding: '4px 10px',
  backgroundColor: 'rgba(210, 105, 30, 0.1)',
  borderRadius: '12px',
  display: 'inline-block',
};

const tipStyle = {
  fontStyle: 'italic',
  color: '#8b4513',  // 📜 棕色提示
  marginTop: '12px',
  fontSize: '0.98rem',
  paddingLeft: '15px',
  borderLeft: '3px solid #d4af37',  // 📜 金色竖线
  backgroundColor: 'rgba(212, 175, 55, 0.08)',
  padding: '8px 8px 8px 15px',
  borderRadius: '4px',
};

const healthBoxStyle = {
  backgroundColor: 'rgba(107, 142, 35, 0.08)',  // 📜 淡橄榄绿
  padding: '28px',
  borderRadius: '8px',
  border: '2px solid #6b8e23',
  marginBottom: '30px',
  boxShadow: `
    inset 0 0 15px rgba(107, 142, 35, 0.08),
    0 3px 12px rgba(92, 51, 23, 0.15)
  `,
  backgroundImage: 'linear-gradient(to bottom, rgba(255, 255, 255, 0.1), transparent)',
};

const letterBoxStyle = {
  backgroundColor: 'rgba(205, 133, 63, 0.12)',  // 📜 古铜色调
  padding: '30px',
  borderRadius: '8px',
  border: '3px double #8b6f47',  // 📜 双线边框
  marginBottom: '30px',
  boxShadow: `
    inset 0 0 25px rgba(139, 111, 71, 0.12),
    0 5px 20px rgba(92, 51, 23, 0.2)
  `,
  position: 'relative',
  backgroundImage: `
    linear-gradient(to bottom, rgba(255, 255, 255, 0.15), transparent),
    url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 20 Q10 10, 20 20 T40 20' stroke='%23c9a875' stroke-width='0.5' fill='none' opacity='0.2'/%3E%3C/svg%3E")
  `,
};

const wisdomBoxStyle = {
  backgroundColor: 'rgba(218, 165, 32, 0.12)',  // 📜 金黄色
  padding: '25px',
  borderRadius: '8px',
  border: '2px solid #d4af37',
  marginBottom: '30px',
  fontStyle: 'italic',
  boxShadow: `
    inset 0 0 20px rgba(212, 175, 55, 0.15),
    0 4px 15px rgba(139, 111, 71, 0.2)
  `,
  textAlign: 'center',
  backgroundImage: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.2), transparent)',
};

const signatureStyle = {
  textAlign: 'right',
  fontSize: '1.4rem',
  fontWeight: 'bold',
  marginTop: '40px',
  color: '#5c3317',
  fontFamily: '"Brush Script MT", cursive',  // 📜 草书签名
};

const footerStyle = {
  display: 'flex',
  justifyContent: 'center',
  gap: '18px',
  marginTop: '45px',
  paddingTop: '30px',
  borderTop: '2px solid #c9a875',
  flexWrap: 'wrap',
};

const btnBase = {
  padding: isMobile ? '12px 20px' : '14px 28px',  // 🔧 移动端缩小按钮
  borderRadius: '6px',
  border: '2px solid #8b6f47',
  cursor: 'pointer',
  fontWeight: '600',
  transition: 'all 0.3s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',  // 🔧 确保按钮内容居中
  gap: '8px',
  fontFamily: '"Georgia", serif',
  fontSize: isMobile ? '0.95rem' : '1.05rem',  // 🔧 移动端缩小字体
  boxShadow: '0 3px 8px rgba(92, 51, 23, 0.2)',
  textShadow: '0.5px 0.5px 1px rgba(0, 0, 0, 0.15)',
  minWidth: isMobile ? '120px' : 'auto',  // 🔧 移动端最小宽度
  touchAction: 'manipulation',  // 🔧 优化触摸响应
  WebkitTapHighlightColor: 'transparent',  // 🔧 移除iOS点击高亮
};

const btnPrimaryStyle = { 
  ...btnBase, 
  backgroundColor: '#8b6f47',  // 📜 古铜色
  color: '#f4e8d0',
  border: '2px solid #6d4c3d',
  boxShadow: '0 4px 12px rgba(92, 51, 23, 0.3)',
};

const btnSecondaryStyle = { 
  ...btnBase, 
  backgroundColor: '#c9a875',  // 📜 浅古铜色
  color: '#3e2723',
  border: '2px solid #8b6f47',
  boxShadow: '0 3px 10px rgba(139, 111, 71, 0.25)',
};

const btnDangerStyle = { 
  ...btnBase, 
  backgroundColor: '#6d4c3d',  // 📜 深棕色
  color: '#f4e8d0',
  border: '2px solid #5c3317',
  boxShadow: '0 4px 12px rgba(92, 51, 23, 0.35)',
};

const loaderStyle = {
  textAlign: 'center',
  color: '#f4e8d0',
  fontFamily: '"Georgia", serif',
};

export default FinalReport;

