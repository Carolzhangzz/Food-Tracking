// GenderSelectionPage.jsx - 性别选择页面（移动端优化版）
import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayerContext } from '../context/PlayerContext';

function GenderSelectionPage() {
  const [selectedGender, setSelectedGender] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768 || window.innerHeight < 500);
  const { playerData, setPlayerData } = useContext(PlayerContext);
  const navigate = useNavigate();

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768 || window.innerHeight < 500);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleConfirm = () => {
    if (!selectedGender) {
      alert(playerData?.language === 'zh' ? '请选择角色性别！' : 'Please select a gender!');
      return;
    }
    
    // 保存性别到playerData
    setPlayerData(prev => ({ ...prev, gender: selectedGender }));
    
    // 跳转到游戏页面
    navigate('/game');
  };

  // 响应式样式 - 横屏优化 + 手机缩小
  const styles = {
    container: {
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: isMobile ? 'flex-start' : 'center', // 🔧 手机版顶部对齐，电脑版居中
      alignItems: 'center',
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
      padding: isMobile ? '10px 10px 40px' : '40px 20px', // 🔧 减少底部填充，让按钮更靠上
      position: 'fixed',
      top: 0,
      left: 0,
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      boxSizing: 'border-box',
    },
    title: {
      fontSize: isMobile ? '1.1rem' : '2.5rem', // 🔧 进一步缩小标题
      color: '#e2e8f0',
      marginTop: isMobile ? '0' : '0',
      marginBottom: isMobile ? '10px' : '3rem',
      textAlign: 'center',
      fontWeight: 'bold',
      textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
      flexShrink: 0,
    },
    cardsContainer: {
      display: 'flex',
      flexDirection: 'row', // 🔧 始终横向排列
      justifyContent: 'center', // 🔧 居中
      alignItems: 'stretch',
      gap: isMobile ? '10px' : '3rem',
      marginBottom: isMobile ? '15px' : '3rem',
      width: '100%',
      maxWidth: isMobile ? '600px' : '900px', // 🔧 限制手机最大宽度，确保不超出屏幕
      padding: isMobile ? '0 10px' : '0',
      flexShrink: 0,
      flexWrap: isMobile ? 'nowrap' : 'nowrap', // 🔧 始终不换行
    },
    card: {
      background: 'rgba(255, 255, 255, 0.05)',
      border: '2px solid rgba(255, 255, 255, 0.1)',
      borderRadius: isMobile ? '12px' : '20px',
      padding: isMobile ? '8px' : '2rem',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: isMobile ? '140px' : '350px',
      gap: isMobile ? '5px' : '1rem',
      flex: '1', // 🔧 均分宽度
      minWidth: 0,
    },
    cardSelected: {
      background: 'rgba(102, 126, 234, 0.2)',
      border: '3px solid #667eea',
      transform: isMobile ? 'scale(1.02)' : 'translateY(-10px)',
      boxShadow: '0 10px 40px rgba(102, 126, 234, 0.4)',
    },
    imageContainer: {
      width: isMobile ? '55px' : '160px', // 🔧 手机图片进一步缩小
      height: isMobile ? '90px' : '260px',
      borderRadius: isMobile ? '8px' : '20px',
      overflow: 'hidden',
      marginBottom: isMobile ? '0' : '1.5rem',
      border: isMobile ? '1.5px solid rgba(255, 255, 255, 0.3)' : '4px solid rgba(255, 255, 255, 0.3)',
      background: 'rgba(255, 255, 255, 0.1)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      flexShrink: 0,
    },
    image: {
      width: '100%',
      height: '100%',
      objectFit: 'contain',
    },
    imageFemale: {
      width: '110%',
      height: '110%',
      objectFit: 'contain',
      transform: 'scale(1.1)',
    },
    textContainer: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      flex: 1,
      textAlign: 'center',
      minWidth: 0,
    },
    genderLabel: {
      fontSize: isMobile ? '0.9rem' : '1.8rem',
      color: '#e2e8f0',
      fontWeight: 'bold',
      marginBottom: isMobile ? '2px' : '0.8rem',
      whiteSpace: 'nowrap',
    },
    genderDescription: {
      fontSize: isMobile ? '0.65rem' : '1rem', // 🔧 进一步缩小
      color: '#94a3b8',
      textAlign: 'center',
      lineHeight: 1.2,
    },
    confirmButton: {
      padding: isMobile ? '10px 30px' : '18px 60px',
      fontSize: isMobile ? '1rem' : '1.3rem',
      background: selectedGender ? '#667eea' : '#4a5568',
      color: '#fff',
      border: 'none',
      borderRadius: '10px',
      cursor: selectedGender ? 'pointer' : 'not-allowed',
      fontWeight: 'bold',
      transition: 'all 0.3s ease',
      boxShadow: selectedGender ? '0 4px 15px rgba(102, 126, 234, 0.4)' : 'none',
      opacity: selectedGender ? 1 : 0.6,
      width: isMobile ? '80%' : 'auto',
      maxWidth: isMobile ? '240px' : 'none',
      flexShrink: 0,
      marginTop: isMobile ? '10px' : '0',
      position: 'relative',
    },
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>
        {playerData?.language === 'zh' ? '选择你的角色' : 'Choose Your Character'}
      </h1>

      <div style={styles.cardsContainer}>
        {/* 角色 A - 阿宇 / River */}
        <div
          style={{
            ...styles.card,
            ...(selectedGender === 'boy' ? styles.cardSelected : {}),
          }}
          onClick={() => setSelectedGender('boy')}
        >
          <div style={styles.imageContainer}>
            <img src="/assets/npc/boynew.png" alt="Character A" style={styles.image} />
          </div>
          <div style={styles.textContainer}>
            <div style={styles.genderLabel}>
              {playerData?.language === 'zh' ? '阿宇 🧑' : 'River 🧑'}
            </div>
            <div style={styles.genderDescription}>
              {playerData?.language === 'zh' 
                ? '勇敢探索的冒险者'
                : 'Brave adventurer'}
            </div>
          </div>
        </div>

        {/* 角色 B - 小琪 / Sage */}
        <div
          style={{
            ...styles.card,
            ...(selectedGender === 'girl' ? styles.cardSelected : {}),
          }}
          onClick={() => setSelectedGender('girl')}
        >
          <div style={styles.imageContainer}>
            <img src="/assets/npc/girlnew.png" alt="Character B" style={styles.imageFemale} />
          </div>
          <div style={styles.textContainer}>
            <div style={styles.genderLabel}>
              {playerData?.language === 'zh' ? '小琪 👧' : 'Sage 👧'}
            </div>
            <div style={styles.genderDescription}>
              {playerData?.language === 'zh' 
                ? '聪慧机敏的探险家'
                : 'Smart explorer'}
            </div>
          </div>
        </div>
      </div>

      <button
        style={styles.confirmButton}
        onClick={handleConfirm}
        disabled={!selectedGender}
      >
        {playerData?.language === 'zh' ? '确认选择' : 'Confirm'}
      </button>
    </div>
  );
}

export default GenderSelectionPage;
