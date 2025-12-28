// Control.jsx - PC 端响应式优化版本
import React, { useCallback, useMemo, memo, useState, useEffect } from "react";
import { useContext } from "react";
import { PlayerContext } from "../context/PlayerContext";
import { updateUserContext } from "../utils/update";
import { playBGM, stopBGM } from "../utils/audioManager";

// 使用 memo 包装组件，避免不必要的重渲染
const Control = memo(() => {
  const { playerId, playerData, setPlayerData, gameRef } = useContext(PlayerContext);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [isHoveringLang, setIsHoveringLang] = useState(false);
  const [isHoveringMusic, setIsHoveringMusic] = useState(false);
  const [isHoveringClue, setIsHoveringClue] = useState(false);
  const [clueCount, setClueCount] = useState(0);

  // 监听窗口大小变化
  useEffect(() => {
    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        setIsDesktop(window.innerWidth >= 1024);
      }, 100);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
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

  // 响应式按钮样式 - 游戏风格优化
  const buttonStyle = useMemo(() => ({
    padding: isDesktop ? "14px" : "10px",
    background: "linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)",
    color: "white",
    border: isDesktop ? "3px solid rgba(102, 126, 234, 0.5)" : "2px solid rgba(102, 126, 234, 0.4)",
    borderRadius: isDesktop ? "16px" : "12px",
    cursor: "pointer",
    fontSize: isDesktop ? "28px" : "22px",
    fontWeight: "bold",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    backdropFilter: "blur(15px)",
    minWidth: isDesktop ? "60px" : "48px",
    minHeight: isDesktop ? "60px" : "48px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: isDesktop 
      ? "0 6px 20px rgba(102, 126, 234, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.1)" 
      : "0 4px 15px rgba(102, 126, 234, 0.25), inset 0 1px 2px rgba(255, 255, 255, 0.1)",
    position: "relative",
    overflow: "hidden",
  }), [isDesktop]);

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
      top: isDesktop ? "24px" : "16px",
      right: isDesktop ? "24px" : "16px",
      display: "flex",
      gap: isDesktop ? "16px" : "12px",
      zIndex: 1000,
    }}>
      {/* 🔧 新增：左上角进度提示 - 游戏风格优化 */}
      <div style={{
        position: "fixed",
        top: isDesktop ? "20px" : "12px",
        left: isDesktop ? "20px" : "12px",
        display: "flex",
        flexDirection: "column",
        gap: isDesktop ? "12px" : "8px",
        zIndex: 1000,
        pointerEvents: "none"
      }}>
        {/* 天数卡片 - 游戏风格 */}
        <div style={{
          background: "linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)",
          backdropFilter: "blur(15px)",
          padding: isDesktop ? "12px 24px" : "8px 16px",
          borderRadius: isDesktop ? "20px" : "14px",
          border: "3px solid rgba(245, 158, 11, 0.5)",
          color: "#fff",
          fontSize: isDesktop ? "18px" : "15px",
          fontWeight: "800",
          display: "flex",
          alignItems: "center",
          gap: isDesktop ? "14px" : "10px",
          boxShadow: "0 8px 25px rgba(245, 158, 11, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.1)",
          borderLeft: "5px solid rgba(245, 158, 11, 0.8)",
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
          
          <span style={{ fontSize: isDesktop ? "24px" : "20px", position: "relative", zIndex: 1 }}>📅</span>
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ 
              fontSize: isDesktop ? "12px" : "10px", 
              color: "#fbbf24", 
              fontWeight: "600",
              letterSpacing: "0.5px",
              marginBottom: "2px"
            }}>
              {playerData.language === "zh" ? "当前进度" : "Progress"}
            </div>
            <div style={{ color: "#fff", fontSize: isDesktop ? "18px" : "15px" }}>
              {playerData.language === "zh" ? `第 ${playerData.currentDay || 1} 天` : `Day ${playerData.currentDay || 1}`}
            </div>
          </div>
        </div>

        {/* 饮食进度图标 - 游戏风格优化 */}
        <div style={{ display: "flex", gap: isDesktop ? "12px" : "8px", marginTop: "4px" }}>
          {["breakfast", "lunch", "dinner"].map(m => {
            // 🔧 修复逻辑：只有明确获取到数据后，才根据数据判断
            // 如果还没加载，默认显示为待完成 (isDone = false)
            const availableMeals = playerData.currentDayMealsRemaining || playerData.availableMealTypes;
            
            // 如果数据还没加载出来，假定所有餐食都还没记录
            const isDone = availableMeals ? !availableMeals.includes(m) : false;
            
            const mealIcons = { breakfast: "☀️", lunch: "🍜", dinner: "🌙" };
            const mealNames = { 
              breakfast: playerData.language === "zh" ? "早" : "B", 
              lunch: playerData.language === "zh" ? "午" : "L", 
              dinner: playerData.language === "zh" ? "晚" : "D" 
            };
            
            return (
              <div key={m} style={{
                width: isDesktop ? "54px" : "44px",
                height: isDesktop ? "54px" : "44px",
                borderRadius: isDesktop ? "16px" : "12px",
                background: isDone 
                  ? "linear-gradient(135deg, rgba(34, 197, 94, 0.3) 0%, rgba(22, 163, 74, 0.3) 100%)"
                  : "linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%)",
                border: isDone 
                  ? "3px solid rgba(34, 197, 94, 0.8)"
                  : "3px solid rgba(102, 126, 234, 0.3)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: isDone ? "#22c55e" : "#64748b",
                backdropFilter: "blur(12px)",
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: isDone 
                  ? "0 0 20px rgba(34, 197, 94, 0.4), inset 0 1px 2px rgba(255, 255, 255, 0.1)" 
                  : "0 4px 15px rgba(0, 0, 0, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.05)",
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
                  fontSize: isDesktop ? "22px" : "18px", 
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
                    bottom: "4px",
                    right: "4px",
                    background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                    color: "white",
                    borderRadius: "50%",
                    width: isDesktop ? "18px" : "16px",
                    height: isDesktop ? "18px" : "16px",
                    fontSize: isDesktop ? "11px" : "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid rgba(30, 41, 59, 0.9)",
                    boxShadow: "0 2px 8px rgba(34, 197, 94, 0.4)",
                    zIndex: 2
                  }}>✓</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 🛠️ 调试：强制触发结局按钮 (仅玩家 002 可见) */}
      {playerId === '002' && (
        <button
          onClick={() => {
            setPlayerData(prev => ({ ...prev, gameCompleted: true }));
          }}
          style={{
            ...langButtonStyle,
            background: "rgba(239, 68, 68, 0.7)",
            borderColor: "#ef4444",
            fontSize: "14px"
          }}
          title="Force Final Report (Debug)"
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
            width: isDesktop ? "40px" : "32px",
            height: isDesktop ? "40px" : "32px",
            objectFit: "contain",
          }}
        />
        {/* 线索数量badge */}
        {clueCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-6px",
              right: "-6px",
              backgroundColor: "#ef4444",
              color: "white",
              borderRadius: "50%",
              width: isDesktop ? "24px" : "20px",
              height: isDesktop ? "24px" : "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: isDesktop ? "12px" : "10px",
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