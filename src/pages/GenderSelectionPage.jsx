// GenderSelectionPage.jsx - 性别选择页面
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayerContext } from '../context/PlayerContext';

function GenderSelectionPage() {
  const [selectedGender, setSelectedGender] = useState(null);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const { playerData, setPlayerData } = useContext(PlayerContext);
  const navigate = useNavigate();

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

  // 响应式样式
  const styles = {
    container: {
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
      padding: '20px',
      position: 'fixed',
      top: 0,
      left: 0,
    },
    title: {
      fontSize: isDesktop ? '2.5rem' : '1.8rem',
      color: '#e2e8f0',
      marginBottom: isDesktop ? '3rem' : '2rem',
      textAlign: 'center',
      fontWeight: 'bold',
      textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
    },
    cardsContainer: {
      display: 'flex',
      flexDirection: isDesktop ? 'row' : 'column',
      gap: isDesktop ? '3rem' : '1.5rem',
      marginBottom: isDesktop ? '3rem' : '2rem',
      width: '100%',
      maxWidth: isDesktop ? '800px' : '400px',
      justifyContent: 'center',
    },
    card: {
      flex: 1,
      background: 'rgba(255, 255, 255, 0.05)',
      border: '3px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '20px',
      padding: isDesktop ? '2rem' : '1.5rem',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: isDesktop ? '350px' : '280px',
    },
    cardSelected: {
      background: 'rgba(102, 126, 234, 0.2)',
      border: '3px solid #667eea',
      transform: isDesktop ? 'translateY(-10px)' : 'translateY(-5px)',
      boxShadow: '0 10px 40px rgba(102, 126, 234, 0.4)',
    },
    imageContainer: {
      width: isDesktop ? '160px' : '120px',
      height: isDesktop ? '260px' : '196px',  // 🔧 boynew比例 380:620
      borderRadius: '20px',  // 🔧 圆角矩形，展示角色
      overflow: 'hidden',
      marginBottom: '1.5rem',
      border: '4px solid rgba(255, 255, 255, 0.3)',
      background: 'rgba(255, 255, 255, 0.1)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    },
    // 🔧 完整显示单张图片（不是雪碧图）
    image: {
      width: '100%',
      height: '100%',
      objectFit: 'contain',
    },
    // 🔧 女性角色专用：稍微放大以匹配男性角色
    imageFemale: {
      width: '120%',  // 放大 20%
      height: '120%',
      objectFit: 'contain',
      transform: 'scale(1.2)',  // 额外缩放
    },
    genderLabel: {
      fontSize: isDesktop ? '1.8rem' : '1.4rem',
      color: '#e2e8f0',
      fontWeight: 'bold',
      marginBottom: '0.8rem',
    },
    genderDescription: {
      fontSize: isDesktop ? '1rem' : '0.9rem',
      color: '#94a3b8',
      textAlign: 'center',
      lineHeight: 1.6,
    },
    confirmButton: {
      padding: isDesktop ? '18px 60px' : '14px 50px',
      fontSize: isDesktop ? '1.3rem' : '1.1rem',
      background: selectedGender ? '#667eea' : '#4a5568',
      color: '#fff',
      border: 'none',
      borderRadius: '14px',
      cursor: selectedGender ? 'pointer' : 'not-allowed',
      fontWeight: 'bold',
      transition: 'all 0.3s ease',
      boxShadow: selectedGender ? '0 6px 20px rgba(102, 126, 234, 0.4)' : 'none',
      opacity: selectedGender ? 1 : 0.6,
    },
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>
        {playerData?.language === 'zh' ? '选择你的角色' : 'Choose Your Character'}
      </h1>

      <div style={styles.cardsContainer}>
        {/* 男性角色 */}
        <div
          style={{
            ...styles.card,
            ...(selectedGender === 'boy' ? styles.cardSelected : {}),
          }}
          onClick={() => setSelectedGender('boy')}
          onMouseEnter={(e) => {
            if (isDesktop && selectedGender !== 'boy') {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.5)';
            }
          }}
          onMouseLeave={(e) => {
            if (isDesktop && selectedGender !== 'boy') {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }
          }}
        >
          <div style={styles.imageContainer}>
            <img src="/assets/npc/boynew.png" alt="Boy" style={styles.image} />
          </div>
          <div style={styles.genderLabel}>
            {playerData?.language === 'zh' ? '男生 🧑' : 'Boy 🧑'}
          </div>
          <div style={styles.genderDescription}>
            {playerData?.language === 'zh' 
              ? '勇敢探索的冒险者'
              : 'Brave adventurer'}
          </div>
        </div>

        {/* 女性角色 */}
        <div
          style={{
            ...styles.card,
            ...(selectedGender === 'girl' ? styles.cardSelected : {}),
          }}
          onClick={() => setSelectedGender('girl')}
          onMouseEnter={(e) => {
            if (isDesktop && selectedGender !== 'girl') {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.5)';
            }
          }}
          onMouseLeave={(e) => {
            if (isDesktop && selectedGender !== 'girl') {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }
          }}
        >
          <div style={styles.imageContainer}>
            <img src="/assets/npc/girlnew.png" alt="Girl" style={styles.imageFemale} />
          </div>
          <div style={styles.genderLabel}>
            {playerData?.language === 'zh' ? '女生 👧' : 'Girl 👧'}
          </div>
          <div style={styles.genderDescription}>
            {playerData?.language === 'zh' 
              ? '聪慧机敏的探险家'
              : 'Smart explorer'}
          </div>
        </div>
      </div>

      <button
        style={styles.confirmButton}
        onClick={handleConfirm}
        disabled={!selectedGender}
        onMouseEnter={(e) => {
          if (selectedGender && isDesktop) {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 8px 30px rgba(102, 126, 234, 0.5)';
          }
        }}
        onMouseLeave={(e) => {
          if (selectedGender) {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
          }
        }}
      >
        {playerData?.language === 'zh' ? '确认选择' : 'Confirm'}
      </button>
    </div>
  );
}

export default GenderSelectionPage;

