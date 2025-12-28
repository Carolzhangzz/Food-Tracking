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
    <div style={overlayStyle}>
      <div style={cardStyle}>
        {/* Decorative Seal */}
        <div style={sealStyle}>華</div>
        
        <h1 style={titleStyle}>{report.title[lang]}</h1>
        
        <div style={contentStyle}>
          {/* Meal Summary */}
          {report.mealSummary && (
            <div style={sectionStyle}>
              <p style={summaryStyle}>{report.mealSummary[lang]}</p>
            </div>
          )}

          {/* Recipe Section */}
          {report.recipe && (
            <div style={recipeContainerStyle}>
              <h2 style={sectionTitleStyle}>
                {lang === 'zh' ? '🍽️ 你的专属食谱' : '🍽️ Your Personal Recipe'}
              </h2>
              <p style={recipeIntroStyle}>{report.recipe.intro?.[lang]}</p>
              
              {/* Starter */}
              {report.recipe.starter && (
                <div style={dishStyle}>
                  <h3 style={dishTitleStyle}>{report.recipe.starter.name[lang]}</h3>
                  <p><strong>{lang === 'zh' ? '食材' : 'Ingredients'}:</strong> {report.recipe.starter.ingredients[lang]}</p>
                  <p><strong>{lang === 'zh' ? '做法' : 'Method'}:</strong> {report.recipe.starter.method[lang]}</p>
                  <p style={tipStyle}>💡 {report.recipe.starter.tip[lang]}</p>
                </div>
              )}
              
              {/* Main */}
              {report.recipe.main && (
                <div style={dishStyle}>
                  <h3 style={dishTitleStyle}>{report.recipe.main.name[lang]}</h3>
                  <p><strong>{lang === 'zh' ? '食材' : 'Ingredients'}:</strong> {report.recipe.main.ingredients[lang]}</p>
                  <p><strong>{lang === 'zh' ? '做法' : 'Method'}:</strong> {report.recipe.main.method[lang]}</p>
                  <p style={tipStyle}>💡 {report.recipe.main.tip[lang]}</p>
                </div>
              )}
              
              {/* Side */}
              {report.recipe.side && (
                <div style={dishStyle}>
                  <h3 style={dishTitleStyle}>{report.recipe.side.name[lang]}</h3>
                  <p><strong>{lang === 'zh' ? '食材' : 'Ingredients'}:</strong> {report.recipe.side.ingredients[lang]}</p>
                  <p><strong>{lang === 'zh' ? '做法' : 'Method'}:</strong> {report.recipe.side.method[lang]}</p>
                  <p style={tipStyle}>💡 {report.recipe.side.tip[lang]}</p>
                </div>
              )}
              
              {/* Dessert */}
              {report.recipe.dessert && (
                <div style={dishStyle}>
                  <h3 style={dishTitleStyle}>{report.recipe.dessert.name[lang]}</h3>
                  <p><strong>{lang === 'zh' ? '食材' : 'Ingredients'}:</strong> {report.recipe.dessert.ingredients[lang]}</p>
                  <p><strong>{lang === 'zh' ? '做法' : 'Method'}:</strong> {report.recipe.dessert.method[lang]}</p>
                  <p style={tipStyle}>💡 {report.recipe.dessert.tip[lang]}</p>
                </div>
              )}
              
              {/* Drink */}
              {report.recipe.drink && (
                <div style={dishStyle}>
                  <h3 style={dishTitleStyle}>{report.recipe.drink.name[lang]}</h3>
                  <p><strong>{lang === 'zh' ? '食材' : 'Ingredients'}:</strong> {report.recipe.drink.ingredients[lang]}</p>
                  <p><strong>{lang === 'zh' ? '做法' : 'Method'}:</strong> {report.recipe.drink.method[lang]}</p>
                </div>
              )}
            </div>
          )}

          {/* Health Analysis */}
          {report.healthAnalysis && (
            <div style={healthBoxStyle}>
              <h2 style={sectionTitleStyle}>
                {lang === 'zh' ? '🌱 健康分析' : '🌱 Health Analysis'}
              </h2>
              <p style={bodyStyle}>{report.healthAnalysis[lang]}</p>
            </div>
          )}

          {/* Letter from Master */}
          {report.letterFromMaster && (
            <div style={letterBoxStyle}>
              <h2 style={sectionTitleStyle}>
                {lang === 'zh' ? '💌 师父的信' : '💌 Letter from Master'}
              </h2>
              <p style={bodyStyle}>{report.letterFromMaster[lang]}</p>
            </div>
          )}
          
          {/* Wisdom */}
          <div style={wisdomBoxStyle}>
            <h3 style={{ marginTop: 0, color: '#854d0e' }}>
              {lang === 'zh' ? '💡 厨师的智慧' : '💡 Chef\'s Wisdom'}
            </h3>
            <p>{report.wisdom[lang]}</p>
          </div>
        </div>

        <div style={footerStyle}>
          <button onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} style={btnSecondaryStyle}>
            {lang === 'zh' ? 'Switch to English' : '切换至中文'}
          </button>
          <button onClick={downloadReport} style={btnPrimaryStyle}>
            {lang === 'zh' ? '📂 下载完整报告' : '📂 Download Full Report'}
          </button>
          <button onClick={onClose} style={btnDangerStyle}>
            {lang === 'zh' ? '🏁 结束旅程' : '🏁 End Journey'}
          </button>
        </div>
      </div>

      <style>{`
        .spinner {
          width: 50px;
          height: 50px;
          border: 5px solid rgba(255,255,255,0.1);
          border-top-color: #fbbf24;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
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
  backgroundColor: 'rgba(0,0,0,0.85)',
  backdropFilter: 'blur(10px)',
  zIndex: 9999,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '20px',
  fontFamily: '"Georgia", serif',
};

const cardStyle = {
  backgroundColor: '#fefce8', // Cream parchment color
  backgroundImage: 'url("https://www.transparenttextures.com/patterns/paper-fibers.png")',
  width: '100%',
  maxWidth: '700px',
  maxHeight: '90vh',
  padding: '40px',
  borderRadius: '4px',
  boxShadow: '0 20px 50px rgba(0,0,0,0.5), inset 0 0 100px rgba(133, 77, 14, 0.1)',
  position: 'relative',
  overflowY: 'auto',
  border: '1px solid #eab308',
};

const sealStyle = {
  position: 'absolute',
  top: '30px',
  right: '40px',
  width: '60px',
  height: '60px',
  border: '3px solid #991b1b',
  borderRadius: '50%',
  color: '#991b1b',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  fontSize: '30px',
  fontWeight: 'bold',
  opacity: 0.6,
  transform: 'rotate(-15deg)',
};

const titleStyle = {
  textAlign: 'center',
  color: '#451a03',
  fontSize: '2.5rem',
  marginBottom: '30px',
  borderBottom: '2px solid #eab308',
  paddingBottom: '10px',
};

const contentStyle = {
  lineHeight: '1.8',
  color: '#451a03',
  fontSize: '1.1rem',
};

const bodyStyle = {
  whiteSpace: 'pre-wrap',
  marginBottom: '20px',
  lineHeight: '1.8',
};

const sectionStyle = {
  marginBottom: '30px',
};

const summaryStyle = {
  fontStyle: 'italic',
  fontSize: '1.05rem',
  textAlign: 'center',
  padding: '15px',
  backgroundColor: 'rgba(254, 249, 195, 0.3)',
  borderRadius: '8px',
};

const sectionTitleStyle = {
  color: '#854d0e',
  fontSize: '1.8rem',
  marginBottom: '15px',
  marginTop: '30px',
  borderBottom: '2px solid #eab308',
  paddingBottom: '8px',
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
  backgroundColor: 'rgba(255, 255, 255, 0.4)',
  padding: '20px',
  borderRadius: '8px',
  marginBottom: '15px',
  borderLeft: '4px solid #ca8a04',
};

const dishTitleStyle = {
  color: '#854d0e',
  fontSize: '1.3rem',
  marginTop: 0,
  marginBottom: '12px',
};

const tipStyle = {
  fontStyle: 'italic',
  color: '#92400e',
  marginTop: '10px',
  fontSize: '0.95rem',
};

const healthBoxStyle = {
  backgroundColor: 'rgba(187, 247, 208, 0.3)',
  padding: '25px',
  borderRadius: '10px',
  borderLeft: '4px solid #16a34a',
  marginBottom: '30px',
};

const letterBoxStyle = {
  backgroundColor: 'rgba(254, 249, 195, 0.4)',
  padding: '25px',
  borderRadius: '10px',
  borderLeft: '4px solid #dc2626',
  marginBottom: '30px',
};

const wisdomBoxStyle = {
  backgroundColor: 'rgba(254, 249, 195, 0.5)',
  padding: '20px',
  borderRadius: '8px',
  borderLeft: '4px solid #eab308',
  marginBottom: '30px',
  fontStyle: 'italic',
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

const btnPrimaryStyle = { ...btnBase, backgroundColor: '#ca8a04', color: 'white' };
const btnSecondaryStyle = { ...btnBase, backgroundColor: '#e2e8f0', color: '#475569' };
const btnDangerStyle = { ...btnBase, backgroundColor: '#991b1b', color: 'white' };

const loaderStyle = {
  textAlign: 'center',
  color: 'white',
};

export default FinalReport;

