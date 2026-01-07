// Control.jsx - PC 端响应式优化版本
import React, { useCallback, useMemo, memo, useState, useEffect } from "react";
import { useContext } from "react";
import { PlayerContext } from "../context/PlayerContext";
import { updateUserContext } from "../utils/update";
import { playBGM, stopBGM } from "../utils/audioManager";

// 使用 memo 包装组件，避免不必要的重渲染
const Control = memo(() => {
  const { playerId, playerData, setPlayerData, gameRef } = useContext(PlayerContext);
  
  // 🔧 更精细的设备检测
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isSmallScreen, setIsSmallScreen] = useState(window.innerHeight < 500); // 手机横屏检测
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth); // 竖屏检测
  
  const [isHoveringLang, setIsHoveringLang] = useState(false);
  const [isHoveringMusic, setIsHoveringMusic] = useState(false);
  const [isHoveringClue, setIsHoveringClue] = useState(false);
  const [clueCount, setClueCount] = useState(0);

  // 监听窗口大小变化 - 优化版
  useEffect(() => {
    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        setIsDesktop(window.innerWidth >= 1024);
        setIsMobile(window.innerWidth < 768);
        setIsSmallScreen(window.innerHeight < 500); // 手机横屏
        setIsPortrait(window.innerHeight > window.innerWidth); // 竖屏
      }, 100);
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize); // 监听屏幕旋转
    // 初始化时也执行一次
    handleResize();
    
    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const toggleMusic = useCallback(() => {
    // 🔧 默认音乐开启（如果未设置，则为true）
    const currentMusicState = playerData.music !== false; // undefined或true都算开启
    const newMusicState = !currentMusicState;

    setPlayerData((prevData) => ({
      ...prevData,
      music: newMusicState,
    }));

    updateUserContext(playerId, {
      ...playerData,
      music: newMusicState,
    });

    if (newMusicState) {
      playBGM();
    } else {
      stopBGM();
    }

    if (gameRef.current) {
      setTimeout(() => {
        try {
          const mainScene = gameRef.current.scene.getScene("MainScene");
          if (mainScene && typeof mainScene.setPlayerData === "function") {
            mainScene.setPlayerData({
              ...playerData,
              music: newMusicState,
            });
          }
        } catch (error) {
          console.error("Error controlling game audio:", error);
        }
      }, 100);
    }
  }, [playerId, playerData, setPlayerData, gameRef]);

  const toggleLanguage = useCallback(() => {
    const selectedLang = playerData.language === "en" ? "zh" : "en";
    
    const updatedPlayerData = {
      ...playerData,
      language: selectedLang,
    };
    
    setPlayerData(updatedPlayerData);
    updateUserContext(playerId, updatedPlayerData);

    if (gameRef.current) {
      setTimeout(() => {
        try {
          const mainScene = gameRef.current.scene.getScene("MainScene");
          if (mainScene) {
            if (typeof mainScene.setPlayerData === "function") {
              mainScene.setPlayerData(updatedPlayerData);
            }

            if (mainScene.npcManager) {
              // 🔧 调用新的语言更新方法
              if (typeof mainScene.npcManager.updateLanguage === "function") {
                mainScene.npcManager.updateLanguage();
              } else {
                mainScene.npcManager.updateNPCStates();
              }
            }

            if (mainScene.uiManager && typeof mainScene.uiManager.updateLanguage === "function") {
              mainScene.uiManager.updateLanguage();
            }

            // 🔧 兼容两种可能的对话场景名
            const dialogScene = gameRef.current.scene.getScene("DialogSceneRefactored") || gameRef.current.scene.getScene("DialogScene");
            if (dialogScene && dialogScene.scene.isActive()) {
              dialogScene.playerData = updatedPlayerData;
              // 强制刷新对话框内容
              if (typeof dialogScene.refreshLanguage === "function") {
                dialogScene.refreshLanguage();
              } else if (dialogScene.uiManager && typeof dialogScene.uiManager.updateNPCName === "function") {
                const lang = updatedPlayerData.language || "zh";
                const name = dialogScene.npcData?.name[lang] || dialogScene.npcData?.name.zh;
                dialogScene.uiManager.updateNPCName(name);
              }
            }
          }
        } catch (error) {
          console.error("Error updating game language:", error);
        }
      }, 50);
    }
  }, [playerId, playerData, setPlayerData, gameRef]);

  // 🔧 打开线索本
  const openClueJournal = useCallback(() => {
    if (gameRef.current) {
      try {
        const mainScene = gameRef.current.scene.getScene("MainScene");
        if (mainScene && mainScene.uiManager) {
          mainScene.uiManager.showClueJournal();
        }
      } catch (error) {
        console.error("Error opening clue journal:", error);
      }
    }
  }, [gameRef]);

  // 🔧 更新线索数量
  useEffect(() => {
    const updateClueCount = () => {
      if (gameRef.current) {
        try {
          const mainScene = gameRef.current.scene.getScene("MainScene");
          if (mainScene && mainScene.uiManager && mainScene.uiManager.clues) {
            setClueCount(mainScene.uiManager.clues.length);
          }
        } catch (error) {
          console.error("Error updating clue count:", error);
        }
      }
    };

    // 每秒更新一次线索数量
    const interval = setInterval(updateClueCount, 1000);
    updateClueCount(); // 立即执行一次

    return () => clearInterval(interval);
  }, [gameRef]);

  // 响应式按钮样式 - 游戏风格优化 + 小屏幕适配 + 竖屏支持
  const buttonStyle = useMemo(() => {
    // 根据屏幕大小和方向动态调整尺寸
    const getSize = () => {
      if (isSmallScreen) return { padding: '6px', minSize: '36px', fontSize: '18px', border: '2px' };
      if (isPortrait && isMobile) return { padding: '8px', minSize: '44px', fontSize: '22px', border: '2px' }; // 竖屏稍大
      if (isMobile) return { padding: '8px', minSize: '42px', fontSize: '20px', border: '2px' };
      return { padding: '14px', minSize: '60px', fontSize: '28px', border: '3px' };
    };
    
    const size = getSize();
    
    return {
      padding: size.padding,
      background: "linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)",
      color: "white",
      border: `${size.border} solid rgba(102, 126, 234, 0.5)`,
      borderRadius: isSmallScreen ? '10px' : (isMobile ? '12px' : '16px'),
      cursor: "pointer",
      fontSize: size.fontSize,
      fontWeight: "bold",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      backdropFilter: "blur(15px)",
      minWidth: size.minSize,
      minHeight: size.minSize,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: isSmallScreen 
        ? "0 2px 8px rgba(102, 126, 234, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.1)"
        : (isMobile 
          ? "0 4px 15px rgba(102, 126, 234, 0.25), inset 0 1px 2px rgba(255, 255, 255, 0.1)"
          : "0 6px 20px rgba(102, 126, 234, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.1)"),
      position: "relative",
      overflow: "hidden",
    };
  }, [isDesktop, isMobile, isSmallScreen, isPortrait]);

  const langButtonStyle = useMemo(() => ({
    ...buttonStyle,
    background: isHoveringLang 
      ? "linear-gradient(135deg, rgba(102, 126, 234, 0.95) 0%, rgba(118, 75, 162, 0.95) 100%)"
      : buttonStyle.background,
    transform: isHoveringLang && isDesktop ? "translateY(-4px) scale(1.08)" : "translateY(0) scale(1)",
    boxShadow: isHoveringLang && isDesktop
      ? "0 10px 30px rgba(102, 126, 234, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.2)"
      : buttonStyle.boxShadow,
    borderColor: isHoveringLang ? "rgba(102, 126, 234, 0.8)" : "rgba(102, 126, 234, 0.5)",
  }), [buttonStyle, isHoveringLang, isDesktop]);

  const musicButtonStyle = useMemo(() => {
    // 🔧 默认音乐开启（如果未设置，则为true）
    const isMusicOn = playerData.music !== false;
    return {
    ...buttonStyle,
      background: isMusicOn
      ? "linear-gradient(135deg, rgba(34, 197, 94, 0.95) 0%, rgba(22, 163, 74, 0.95) 100%)"
      : "linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(220, 38, 38, 0.95) 100%)",
      borderColor: isMusicOn 
      ? "rgba(34, 197, 94, 0.6)"
      : "rgba(239, 68, 68, 0.6)",
    transform: isHoveringMusic && isDesktop ? "translateY(-4px) scale(1.08)" : "translateY(0) scale(1)",
    boxShadow: isHoveringMusic && isDesktop
        ? isMusicOn
        ? "0 10px 30px rgba(34, 197, 94, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.2)"
        : "0 10px 30px rgba(239, 68, 68, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.2)"
        : buttonStyle.boxShadow,
    };
  }, [buttonStyle, playerData.music, isHoveringMusic, isDesktop]);

  // 🔧 线索本按钮样式 - 游戏风格优化
  const clueButtonStyle = useMemo(() => ({
    ...buttonStyle,
    background: isHoveringClue
      ? "linear-gradient(135deg, rgba(168, 85, 247, 0.95) 0%, rgba(126, 34, 206, 0.95) 100%)"
      : "linear-gradient(135deg, rgba(139, 92, 246, 0.95) 0%, rgba(109, 40, 217, 0.95) 100%)",
    borderColor: isHoveringClue ? "rgba(168, 85, 247, 0.8)" : "rgba(139, 92, 246, 0.6)",
    transform: isHoveringClue && isDesktop ? "translateY(-4px) scale(1.08)" : "translateY(0) scale(1)",
    boxShadow: isHoveringClue && isDesktop
      ? "0 10px 30px rgba(139, 92, 246, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.2)"
      : buttonStyle.boxShadow,
    position: "relative",
  }), [buttonStyle, isHoveringClue, isDesktop]);

  return (
    <div style={{
      position: "fixed",
      top: isSmallScreen ? "6px" : (isMobile ? "12px" : "24px"),
      right: isSmallScreen ? "6px" : (isMobile ? "12px" : "24px"),
      display: "flex",
      gap: isSmallScreen ? "6px" : (isMobile ? "8px" : "16px"),
      zIndex: 1000,
    }}>
      {/* 🔧 新增：左上角进度提示 - 游戏风格优化 + 小屏幕适配 */}
      <div style={{
        position: "fixed",
        top: isSmallScreen ? "6px" : (isMobile ? "12px" : "20px"),
        left: isSmallScreen ? "6px" : (isMobile ? "12px" : "20px"),
        display: "flex",
        flexDirection: "column",
        gap: isSmallScreen ? "4px" : (isMobile ? "6px" : "12px"),
        zIndex: 1000,
        pointerEvents: "none"
      }}>
        {/* 天数卡片 - 游戏风格 + 小屏幕适配 */}
        <div style={{
          background: "linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)",
          backdropFilter: "blur(15px)",
          padding: isSmallScreen ? "4px 10px" : (isMobile ? "6px 12px" : "12px 24px"),
          borderRadius: isSmallScreen ? "10px" : (isMobile ? "12px" : "20px"),
          border: isSmallScreen ? "2px solid rgba(245, 158, 11, 0.5)" : "3px solid rgba(245, 158, 11, 0.5)",
          color: "#fff",
          fontSize: isSmallScreen ? "11px" : (isMobile ? "13px" : "18px"),
          fontWeight: "800",
          display: "flex",
          alignItems: "center",
          gap: isSmallScreen ? "6px" : (isMobile ? "8px" : "14px"),
          boxShadow: isSmallScreen 
            ? "0 2px 10px rgba(245, 158, 11, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.1)"
            : "0 8px 25px rgba(245, 158, 11, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.1)",
          borderLeft: isSmallScreen ? "3px solid rgba(245, 158, 11, 0.8)" : "5px solid rgba(245, 158, 11, 0.8)",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* 背景光效 */}
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, transparent 50%)",
            pointerEvents: "none",
          }}/>
          
          <span style={{ 
            fontSize: isSmallScreen ? "14px" : (isMobile ? "16px" : "24px"), 
            position: "relative", 
            zIndex: 1 
          }}>📅</span>
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ 
              fontSize: isSmallScreen ? "9px" : (isMobile ? "10px" : "12px"), 
              color: "#fbbf24", 
              fontWeight: "600",
              letterSpacing: "0.5px",
              marginBottom: isSmallScreen ? "0" : "2px"
            }}>
              {playerData.language === "zh" ? "当前进度" : "Progress"}
            </div>
            <div style={{ 
              color: "#fff", 
              fontSize: isSmallScreen ? "11px" : (isMobile ? "13px" : "18px") 
            }}>
              {playerData.language === "zh" ? `第 ${playerData.currentDay || 1} 天` : `Day ${playerData.currentDay || 1}`}
            </div>
          </div>
        </div>

        {/* 饮食进度图标 - 游戏风格优化 + 小屏幕适配 */}
        <div style={{ 
          display: "flex", 
          gap: isSmallScreen ? "4px" : (isMobile ? "6px" : "12px"), 
          marginTop: isSmallScreen ? "2px" : "4px" 
        }}>
          {["breakfast", "lunch", "dinner"].map(m => {
            // 🔧 修复逻辑：只有明确获取到数据后，才根据数据判断
            // 优先使用 currentDayMealsRemaining，如果不存在则所有图标置灰
            const availableMeals = playerData.currentDayMealsRemaining;
            
            // 关键：只有当 availableMeals 是数组且不为 null/undefined 时才进行判断
            // 如果数据还没准备好，所有图标都应该是置灰状态 (isDone = false)
            const isDone = (Array.isArray(availableMeals) && availableMeals.length > 0) 
              ? !availableMeals.includes(m) 
              : (Array.isArray(availableMeals) && availableMeals.length === 0 ? true : false);
            
            const mealIcons = { breakfast: "☀️", lunch: "🍜", dinner: "🌙" };
            const mealNames = { 
              breakfast: playerData.language === "zh" ? "早" : "B", 
              lunch: playerData.language === "zh" ? "午" : "L", 
              dinner: playerData.language === "zh" ? "晚" : "D" 
            };
            
            // 动态计算尺寸
            const iconSize = isSmallScreen ? "28px" : (isMobile ? "36px" : "54px");
            const iconFontSize = isSmallScreen ? "12px" : (isMobile ? "14px" : "22px");
            const checkSize = isSmallScreen ? "12px" : (isMobile ? "14px" : "18px");
            const borderWidth = isSmallScreen ? "2px" : "3px";
            
            return (
              <div key={m} style={{
                width: iconSize,
                height: iconSize,
                borderRadius: isSmallScreen ? "8px" : (isMobile ? "10px" : "16px"),
                background: isDone 
                  ? "linear-gradient(135deg, rgba(34, 197, 94, 0.3) 0%, rgba(22, 163, 74, 0.3) 100%)"
                  : "linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)",
                border: `${borderWidth} solid ${isDone 
                  ? "rgba(34, 197, 94, 0.8)"
                  : "rgba(102, 126, 234, 0.3)"}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: isDone ? "#22c55e" : "#64748b",
                backdropFilter: "blur(12px)",
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: isDone 
                  ? (isSmallScreen 
                    ? "0 0 10px rgba(34, 197, 94, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.1)"
                    : "0 0 20px rgba(34, 197, 94, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.1)")
                  : (isSmallScreen
                    ? "0 2px 8px rgba(0, 0, 0, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.05)"
                    : "0 4px 15px rgba(0, 0, 0, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.05)"),
                position: "relative",
                overflow: "hidden"
              }}>
                {/* 背景光效 */}
                {isDone && (
                  <div style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, transparent 50%)",
                    pointerEvents: "none",
                  }}/>
                )}
                
                <span style={{ 
                  fontSize: iconFontSize, 
                  opacity: isDone ? 1 : 0.5,
                  position: "relative",
                  zIndex: 1,
                  filter: isDone ? "drop-shadow(0 0 4px rgba(34, 197, 94, 0.6))" : "none"
                }}>
                  {mealIcons[m]}
                </span>
                {isDone && (
                  <div style={{
                    position: "absolute",
                    bottom: isSmallScreen ? "2px" : "4px",
                    right: isSmallScreen ? "2px" : "4px",
                    background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                    color: "white",
                    borderRadius: "50%",
                    width: checkSize,
                    height: checkSize,
                    fontSize: isSmallScreen ? "8px" : (isMobile ? "9px" : "11px"),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: `${isSmallScreen ? "1px" : "2px"} solid rgba(30, 41, 59, 0.9)`,
                    boxShadow: "0 2px 8px rgba(34, 197, 94, 0.4)",
                    zIndex: 2
                  }}>✓</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 🏆 查看最终报告按钮 - 第7天三餐全部完成后解锁 */}
      {playerData?.currentDay >= 7 && playerData?.currentDayMealsRemaining === 0 && (
        <button
          onClick={() => {
            console.log("🏆 触发 Final Report");
            setPlayerData(prev => ({ ...prev, gameCompleted: true }));
          }}
          style={{
            ...langButtonStyle,
            background: "linear-gradient(135deg, rgba(251, 191, 36, 0.9), rgba(245, 158, 11, 0.9))",
            borderColor: "#f59e0b",
            fontSize: isSmallScreen ? "22px" : (isMobile ? "24px" : "18px"),
            boxShadow: "0 6px 20px rgba(251, 191, 36, 0.6)"
          }}
          title={playerData.language === "zh" ? "查看最终报告" : "View Final Report"}
        >
          🏆
        </button>
      )}

      {/* 语言切换按钮 - 优化图标 */}
      <button
        style={langButtonStyle}
        onClick={toggleLanguage}
        onMouseEnter={() => isDesktop && setIsHoveringLang(true)}
        onMouseLeave={() => setIsHoveringLang(false)}
        title={playerData.language === "zh" 
          ? "切换到 English / Switch to English" 
          : "切换到中文 / Switch to Chinese"}
      >
        {playerData.language === "zh" ? "🌐" : "🌍"}
      </button>

      {/* 音乐控制按钮 - 优化图标 */}
      <button
        style={musicButtonStyle}
        onClick={toggleMusic}
        onMouseEnter={() => isDesktop && setIsHoveringMusic(true)}
        onMouseLeave={() => setIsHoveringMusic(false)}
        title={
          playerData.music !== false
            ? "点击关闭音乐 / Click to mute"
            : "点击开启音乐 / Click to unmute"
        }
      >
        {playerData.music !== false ? "🎶" : "🔇"}
      </button>

      {/* 🔧 线索本按钮 - 使用cluebook.png图片 */}
      <button
        style={clueButtonStyle}
        onClick={openClueJournal}
        onMouseEnter={() => isDesktop && setIsHoveringClue(true)}
        onMouseLeave={() => setIsHoveringClue(false)}
        title={
          playerData.language === "zh"
            ? "查看线索本 / View Clue Journal"
            : "View Clue Journal / 查看线索本"
        }
      >
        {/* 🔧 使用cluebook图片 */}
        <img 
          src="/assets/elements/cluebook.png" 
          alt="Clue Book"
          style={{
            width: isSmallScreen ? "20px" : (isMobile ? "26px" : "40px"),
            height: isSmallScreen ? "20px" : (isMobile ? "26px" : "40px"),
            objectFit: "contain",
          }}
        />
        {/* 线索数量badge - 小屏幕适配 */}
        {clueCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: isSmallScreen ? "-4px" : "-6px",
              right: isSmallScreen ? "-4px" : "-6px",
              backgroundColor: "#ef4444",
              color: "white",
              borderRadius: "50%",
              width: isSmallScreen ? "14px" : (isMobile ? "18px" : "24px"),
              height: isSmallScreen ? "14px" : (isMobile ? "18px" : "24px"),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: isSmallScreen ? "8px" : (isMobile ? "9px" : "12px"),
              fontWeight: "bold",
              border: "2px solid white",
              boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
            }}
          >
            {clueCount}
          </span>
        )}
      </button>
    </div>
  );
});

Control.displayName = 'Control';

export default Control;