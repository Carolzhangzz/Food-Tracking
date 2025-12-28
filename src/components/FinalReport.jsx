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
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
        const response = await fetch(`${API_URL}/generate-final-report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
    
    const content = `
${report.title[lang]}
----------------------------------------
${report.letterBody[lang]}

Wisdom from the Chef:
${report.wisdom[lang]}

${report.signature[lang]}
    `;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Chef_Hua_Letter_${lang}.txt`;
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
          <p style={bodyStyle}>{report.letterBody[lang]}</p>
          
          <div style={wisdomBoxStyle}>
            <h3 style={{ marginTop: 0, color: '#854d0e' }}>
              {lang === 'zh' ? '💡 厨师的智慧' : '💡 Chef\'s Wisdom'}
            </h3>
            <p>{report.wisdom[lang]}</p>
          </div>
          
          <p style={signatureStyle}>{report.signature[lang]}</p>
        </div>

        <div style={footerStyle}>
          <button onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} style={btnSecondaryStyle}>
            {lang === 'zh' ? 'Switch to English' : '切换至中文'}
          </button>
          <button onClick={downloadReport} style={btnPrimaryStyle}>
            {lang === 'zh' ? '📂 下载报告' : '📂 Download Report'}
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

