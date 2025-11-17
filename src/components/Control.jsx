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
    const newMusicState = !playerData.music;

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
              mainScene.npcManager.scene.playerData = updatedPlayerData;
              
              if (mainScene.npcManager.clueRecords) {
                mainScene.npcManager.clueRecords = mainScene.npcManager.clueRecords.map(clue => ({
                  ...clue,
                  clue: mainScene.npcManager.getNPCClue(clue.npcId),
                  npcName: mainScene.npcManager.getNPCNameByLanguage(clue.npcId)
                }));
              }

              mainScene.npcManager.updateNPCStates();
            }

            if (mainScene.uiManager) {
              if (mainScene.npcManager && mainScene.npcManager.clueRecords) {
                mainScene.uiManager.clues = [];
                mainScene.npcManager.clueRecords.forEach(clue => {
                  mainScene.uiManager.addClue(clue);
                });
              }
            }

            const dialogScene = gameRef.current.scene.getScene("DialogScene");
            if (dialogScene && dialogScene.scene.isActive()) {
              dialogScene.playerData = updatedPlayerData;
            }
          }
        } catch (error) {
          console.error("Error updating game language:", error);
        }
      }, 100);
    }
  }, [playerId, playerData, setPlayerData, gameRef]);

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

  const musicButtonStyle = useMemo(() => ({
    ...buttonStyle,
    backgroundColor: playerData.music
      ? "rgba(34, 197, 94, 0.9)"
      : "rgba(239, 68, 68, 0.9)",
    borderColor: playerData.music 
      ? isDesktop ? "#22c55e" : "rgba(34, 197, 94, 0.6)"
      : isDesktop ? "#ef4444" : "rgba(239, 68, 68, 0.6)",
    transform: isHoveringMusic && isDesktop ? "translateY(-3px) scale(1.05)" : "translateY(0) scale(1)",
    boxShadow: isHoveringMusic && isDesktop
      ? playerData.music
        ? "0 8px 20px rgba(34, 197, 94, 0.5)"
        : "0 8px 20px rgba(239, 68, 68, 0.5)"
      : buttonStyle.boxShadow,
  }), [buttonStyle, playerData.music, isHoveringMusic, isDesktop]);

  return (
    <div style={{
      position: "fixed",
      top: isDesktop ? "24px" : "16px",
      right: isDesktop ? "24px" : "16px",
      display: "flex",
      gap: isDesktop ? "16px" : "12px",
      zIndex: 1000,
    }}>
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
          playerData.music
            ? "点击关闭音乐 / Click to mute"
            : "点击开启音乐 / Click to unmute"
        }
      >
        {playerData.music ? "🎵" : "🔇"}
      </button>
    </div>
  );
});

Control.displayName = 'Control';

export default Control;