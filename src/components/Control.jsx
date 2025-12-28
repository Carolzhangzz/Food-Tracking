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

  // 响应式按钮样式
  const buttonStyle = useMemo(() => ({
    padding: isDesktop ? "16px" : "12px",
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    color: "white",
    border: isDesktop ? "2px solid rgba(255, 255, 255, 0.4)" : "2px solid rgba(255, 255, 255, 0.3)",
    borderRadius: isDesktop ? "12px" : "8px",
    cursor: "pointer",
    fontSize: isDesktop ? "20px" : "16px",
    fontWeight: "bold",
    fontFamily: "'Courier New', monospace",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    backdropFilter: "blur(10px)",
    minWidth: isDesktop ? "70px" : "50px",
    minHeight: isDesktop ? "70px" : "50px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: isDesktop 
      ? "0 4px 12px rgba(0,0,0,0.4)" 
      : "0 2px 8px rgba(0,0,0,0.3)",
  }), [isDesktop]);

  const langButtonStyle = useMemo(() => ({
    ...buttonStyle,
    transform: isHoveringLang && isDesktop ? "translateY(-3px) scale(1.05)" : "translateY(0) scale(1)",
    boxShadow: isHoveringLang && isDesktop
      ? "0 8px 20px rgba(102, 126, 234, 0.5)"
      : buttonStyle.boxShadow,
  }), [buttonStyle, isHoveringLang, isDesktop]);

  const musicButtonStyle = useMemo(() => {
    // 🔧 默认音乐开启（如果未设置，则为true）
    const isMusicOn = playerData.music !== false;
    return {
    ...buttonStyle,
      backgroundColor: isMusicOn
      ? "rgba(34, 197, 94, 0.9)"
      : "rgba(239, 68, 68, 0.9)",
      borderColor: isMusicOn 
      ? isDesktop ? "#22c55e" : "rgba(34, 197, 94, 0.6)"
      : isDesktop ? "#ef4444" : "rgba(239, 68, 68, 0.6)",
    transform: isHoveringMusic && isDesktop ? "translateY(-3px) scale(1.05)" : "translateY(0) scale(1)",
    boxShadow: isHoveringMusic && isDesktop
        ? isMusicOn
        ? "0 8px 20px rgba(34, 197, 94, 0.5)"
        : "0 8px 20px rgba(239, 68, 68, 0.5)"
        : buttonStyle.boxShadow,
    };
  }, [buttonStyle, playerData.music, isHoveringMusic, isDesktop]);

  // 🔧 线索本按钮样式
  const clueButtonStyle = useMemo(() => ({
    ...buttonStyle,
    backgroundColor: "rgba(139, 92, 246, 0.9)",
    borderColor: isDesktop ? "#8b5cf6" : "rgba(139, 92, 246, 0.6)",
    transform: isHoveringClue && isDesktop ? "translateY(-3px) scale(1.05)" : "translateY(0) scale(1)",
    boxShadow: isHoveringClue && isDesktop
      ? "0 8px 20px rgba(139, 92, 246, 0.5)"
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
      {/* 🔧 新增：左上角进度提示 */}
      <div style={{
        position: "fixed",
        top: isDesktop ? "24px" : "16px",
        left: isDesktop ? "24px" : "16px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        zIndex: 1000,
        pointerEvents: "none"
      }}>
        {/* 天数卡片 */}
        <div style={{
          backgroundColor: "rgba(30, 41, 59, 0.8)",
          backdropFilter: "blur(12px)",
          padding: isDesktop ? "8px 20px" : "6px 14px",
          borderRadius: "16px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          color: "#fff",
          fontSize: isDesktop ? "16px" : "14px",
          fontWeight: "700",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          boxShadow: "0 8px 20px rgba(0,0,0,0.4)",
          borderLeft: "4px solid #f59e0b"
        }}>
          <span style={{ fontSize: "20px" }}>📅</span>
          <div>
            <div style={{ fontSize: isDesktop ? "14px" : "12px", color: "#94a3b8", fontWeight: "normal" }}>
              {playerData.language === "zh" ? "当前进度" : "Progress"}
            </div>
            {playerData.language === "zh" ? `第 ${playerData.currentDay || 1} 天` : `Day ${playerData.currentDay || 1}`}
          </div>
        </div>

        {/* 饮食进度图标 */}
        <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
          {["breakfast", "lunch", "dinner"].map(m => {
            // 🔧 修复逻辑：只有明确获取到数据后，才根据数据判断
            // 如果还没加载，默认显示为待完成 (isDone = false)
            const availableMeals = playerData.currentDayMealsRemaining || playerData.availableMealTypes;
            
            // 如果数据还没加载出来，假定所有餐食都还没记录
            const isDone = availableMeals ? !availableMeals.includes(m) : false;
            
            const mealIcons = { breakfast: "🍳", lunch: "🍲", dinner: "🌙" };
            const mealNames = { 
              breakfast: playerData.language === "zh" ? "早" : "B", 
              lunch: playerData.language === "zh" ? "午" : "L", 
              dinner: playerData.language === "zh" ? "晚" : "D" 
            };
            
            return (
              <div key={m} style={{
                width: isDesktop ? "44px" : "38px",
                height: isDesktop ? "44px" : "38px",
                borderRadius: "12px",
                backgroundColor: isDone ? "rgba(34, 197, 94, 0.2)" : "rgba(30, 41, 59, 0.6)",
                border: `2px solid ${isDone ? "#22c55e" : "rgba(255, 255, 255, 0.1)"}`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: isDone ? "#22c55e" : "#64748b",
                backdropFilter: "blur(8px)",
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: isDone ? "0 0 15px rgba(34, 197, 94, 0.3)" : "none",
                position: "relative",
                overflow: "hidden"
              }}>
                <span style={{ fontSize: isDesktop ? "18px" : "16px", opacity: isDone ? 1 : 0.5 }}>
                  {mealIcons[m]}
                </span>
                {isDone && (
                  <div style={{
                    position: "absolute",
                    bottom: "-2px",
                    right: "-2px",
                    backgroundColor: "#22c55e",
                    color: "white",
                    borderRadius: "50%",
                    width: "16px",
                    height: "16px",
                    fontSize: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid #1e293b"
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

      {/* 语言切换按钮 */}
      <button
        style={langButtonStyle}
        onClick={toggleLanguage}
        onMouseEnter={() => isDesktop && setIsHoveringLang(true)}
        onMouseLeave={() => setIsHoveringLang(false)}
        title={playerData.language === "zh" 
          ? "切换到 English / Switch to English" 
          : "切换到中文 / Switch to Chinese"}
      >
        {playerData.language === "zh" ? "中" : "EN"}
      </button>

      {/* 音乐控制按钮 */}
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
        {playerData.music !== false ? "🎵" : "🔇"}
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