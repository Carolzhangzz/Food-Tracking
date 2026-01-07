// LoadingPage.jsx - 独立的加载页面
import React, { useEffect, useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PlayerContext } from '../context/PlayerContext';

// 🔧 随机名字生成函数
function generateRandomName(lang = 'zh') {
  const chineseNames = [
    '小林', '小王', '小李', '小张', '小陈', '小刘', '小赵', '小孙',
    '阿明', '阿华', '阿杰', '阿强', '阿伟', '阿文', '阿勇', '阿军',
    '晓东', '晓明', '晓华', '晓燕', '晓红', '晓芳', '晓丽', '晓梅',
    '思远', '思琪', '思雨', '思慧', '思涵', '思敏', '思婷', '思颖',
    '宇轩', '宇航', '宇晨', '宇凡', '宇恒', '宇鹏', '宇辰', '宇浩'
  ];
  
  const englishNames = [
    'Alex', 'Jamie', 'Taylor', 'Jordan', 'Morgan', 'Casey', 'Riley', 'Avery',
    'Quinn', 'Sage', 'River', 'Phoenix', 'Dakota', 'Skyler', 'Logan', 'Cameron',
    'Parker', 'Blake', 'Reese', 'Eden', 'Aspen', 'Hunter', 'Peyton', 'Emerson',
    'Harper', 'Finley', 'Rowan', 'Sawyer', 'Charlie', 'Ellis', 'Jules', 'Kai'
  ];
  
  const names = lang === 'zh' ? chineseNames : englishNames;
  return names[Math.floor(Math.random() * names.length)];
}

function LoadingPage() {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingTip, setLoadingTip] = useState('');
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const { playerData, playerId, setPlayerData } = useContext(PlayerContext);
  const navigate = useNavigate();
  const location = useLocation();

  // 组件加载时的日志
  useEffect(() => {
    console.log("🚀 LoadingPage: 组件已加载", {
      playerId,
      hasPlayerData: !!playerData,
      locationState: location.state,
      pathname: location.pathname
    });
  }, []);

  const tips = {
    en: [
      "Tip: Talk to different NPCs to unlock clues...",
      "Tip: Pay attention to meal details...",
      "Tip: Some NPCs are only available at specific times...",
      "Tip: Record three meals each day...",
      "Tip: The village has many secrets waiting to be discovered..."
    ],
    zh: [
      "提示：与不同的NPC对话可以解锁线索...",
      "提示：注意饮食细节...",
      "提示：某些NPC只在特定时间出现...",
      "提示：每天记录三餐...",
      "提示：村庄里有许多秘密等待你发现..."
    ]
  };

  // 检查是否是再次登录（跳过 intro）
  useEffect(() => {
    // 如果是从 CutScenePlayer 来的，不显示欢迎组件（刚看完 cutscene）
    const fromCutscene = location.state?.fromCutscene;
    if (fromCutscene) {
      console.log("✅ LoadingPage: 刚从 CutScenePlayer 来，不显示欢迎组件");
      setShowWelcomeBack(false);
      return;
    }

    // 否则，检查是否是再次登录（从 LoginPage 直接来的）
    if (playerId) {
      const cutsceneSeenKey = `cutsceneSeen_v1_${playerId}`;
      const cutsceneSeen = localStorage.getItem(cutsceneSeenKey);
      
      // 如果是再次登录（已看过 cutscene），显示欢迎回来组件
      if (cutsceneSeen === "1") {
        console.log("✅ LoadingPage: 再次登录，显示欢迎回来组件");
        setShowWelcomeBack(true);
        
        // 3秒后隐藏欢迎组件并开始加载
        const welcomeTimer = setTimeout(() => {
          setShowWelcomeBack(false);
        }, 3000);
        
        return () => clearTimeout(welcomeTimer);
      } else {
        // 首次登录，也不显示欢迎组件
        console.log("✅ LoadingPage: 首次登录，不显示欢迎组件");
        setShowWelcomeBack(false);
      }
    }
  }, [playerId, location.state]);

  // 加载进度逻辑
  useEffect(() => {
    // 如果正在显示欢迎组件，等待它完成
    if (showWelcomeBack) {
      return;
    }

    console.log("✅ LoadingPage: 开始加载进度");
    
    // 模拟加载进度 - 减慢速度让用户能看到加载过程
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          // 🔧 加载完成，生成随机名字并直接跳转到游戏
          console.log("✅ LoadingPage: 加载完成，生成随机名字并跳转到游戏");
          
          // 生成随机名字
          const randomName = generateRandomName(playerData?.language || 'zh');
          setPlayerData(prevData => ({ 
            ...prevData, 
            playerName: randomName 
          }));
          
          setTimeout(() => {
            navigate('/game');
          }, 500);
          return 100;
        }
        // 使用非线性增长，让前期快速，后期缓慢
        // 减慢加载速度：每 200ms 更新一次，增量更小
        const increment = prev < 50 ? 5 : prev < 80 ? 3 : 1.5;
        return Math.min(prev + increment, 100);
      });
    }, 200);

    // 随机显示提示
    const tipInterval = setInterval(() => {
      const currentTips = tips[playerData?.language || 'en'];
      const randomTip = currentTips[Math.floor(Math.random() * currentTips.length)];
      setLoadingTip(randomTip);
    }, 3000);

    // 初始提示
    const initialTips = tips[playerData?.language || 'en'];
    setLoadingTip(initialTips[0]);

    return () => {
      clearInterval(progressInterval);
      clearInterval(tipInterval);
      console.log("🧹 LoadingPage: 清理定时器");
    };
  }, [navigate, playerData, showWelcomeBack]);

  return (
    <div style={styles.container}>
      {/* 欢迎回来组件（再次登录时显示） */}
      {showWelcomeBack ? (
        <div style={welcomeStyles.content}>
          <div style={welcomeStyles.icon}>🍳</div>
          <h1 style={welcomeStyles.title}>
            {playerData?.language === 'zh' 
              ? `欢迎回来，${playerData?.firstName || '玩家'}！` 
              : `Welcome back, ${playerData?.firstName || 'Player'}!`}
          </h1>
          <p style={welcomeStyles.subtitle}>
            {playerData?.language === 'zh' 
              ? '继续你的旅程...' 
              : 'Continuing your journey...'}
          </p>
        </div>
      ) : (
      <div style={styles.content}>
        {/* 标题 */}
        <h1 style={styles.title}>
          🍳 FEASTORY
        </h1>

        {/* 加载图标 */}
        <div style={styles.loadingIcon}>
          <div style={styles.spinner} />
        </div>

        {/* 加载消息 */}
        <div style={styles.loadingText}>
          {playerData?.language === 'zh' ? '正在进入游戏世界...' : 'Entering the game world...'}
        </div>

        {/* 进度条 */}
        <div style={styles.progressBarContainer}>
          <div 
            style={{
              ...styles.progressBar,
              width: `${loadingProgress}%`
            }}
          />
        </div>

        {/* 进度百分比 */}
        <div style={styles.progressText}>
          {Math.round(loadingProgress)}%
        </div>

        {/* 提示信息 */}
        <div style={styles.tipContainer}>
          <p style={styles.tip}>{loadingTip}</p>
        </div>
      </div>
      )}

      {/* 添加动画样式 */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

const welcomeStyles = {
  content: {
    textAlign: 'center',
    padding: '20px',
    maxWidth: '500px',
    width: '90%',
    animation: 'fadeIn 0.8s ease-in-out',
  },
  icon: {
    fontSize: 'clamp(3rem, 10vw, 5rem)',
    marginBottom: '2rem',
    animation: 'pulse 2s infinite',
  },
  title: {
    fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
    color: '#ffd700',
    marginBottom: '1rem',
    textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 'clamp(1rem, 3vw, 1.3rem)',
    color: '#94a3b8',
    fontStyle: 'italic',
    marginTop: '1rem',
  },
};

const styles = {
  container: {
    width: '100vw',
    height: '100vh',
    background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    color: '#e2e8f0',
    fontFamily: "'Courier New', monospace",
    overflow: 'hidden',
  },
  content: {
    textAlign: 'center',
    padding: '20px',
    maxWidth: '500px',
    width: '90%',
  },
  title: {
    fontSize: 'clamp(2rem, 6vw, 3rem)',
    color: '#ffd700',
    marginBottom: '2rem',
    textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
    animation: 'pulse 2s infinite',
  },
  loadingIcon: {
    width: '80px',
    height: '80px',
    margin: '0 auto 2rem',
    position: 'relative',
  },
  spinner: {
    width: '100%',
    height: '100%',
    border: '4px solid rgba(102, 126, 234, 0.2)',
    borderTop: '4px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: 'clamp(1rem, 3vw, 1.2rem)',
    marginBottom: '2rem',
    fontWeight: '600',
    color: '#e2e8f0',
  },
  progressBarContainer: {
    width: '100%',
    height: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '6px',
    overflow: 'hidden',
    marginBottom: '1rem',
    border: '1px solid rgba(102, 126, 234, 0.3)',
  },
  progressBar: {
    height: '100%',
    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
    transition: 'width 0.3s ease',
    borderRadius: '6px',
    boxShadow: '0 0 10px rgba(102, 126, 234, 0.5)',
  },
  progressText: {
    fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)',
    opacity: 0.8,
    marginBottom: '2rem',
    color: '#94a3b8',
  },
  tipContainer: {
    minHeight: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 10px',
  },
  tip: {
    fontSize: 'clamp(0.85rem, 2vw, 1rem)',
    color: '#94a3b8',
    fontStyle: 'italic',
    lineHeight: 1.6,
    animation: 'fadeIn 0.5s ease-in-out',
    margin: 0,
  },
};

export default LoadingPage;