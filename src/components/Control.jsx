// Control.js - 修复语言切换时更新线索
import React from "react";
import { useContext } from "react";
import { PlayerContext } from "../context/PlayerContext";
import { updateUserContext } from "../utils/update";
import { playBGM, stopBGM } from "../utils/audioManager";

function Control() {
  const { playerId, playerData, setPlayerData, gameRef } = useContext(PlayerContext);

  const toggleMusic = () => {
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
        alert("音频控制出现问题，请刷新页面重试 / Audio control error, please refresh the page");
      }
    }
  };

  const toggleLanguage = () => {
    const selectedLang = playerData.language === "en" ? "zh" : "en";
    
    // 更新本地状态
    const updatedPlayerData = {
      ...playerData,
      language: selectedLang,
    };
    
    setPlayerData(updatedPlayerData);
    
    // 更新服务器数据
    updateUserContext(playerId, updatedPlayerData);

    if (gameRef.current) {
      try {
        const mainScene = gameRef.current.scene.getScene("MainScene");
        if (mainScene) {
          // 更新主场景的玩家数据
          if (typeof mainScene.setPlayerData === "function") {
            mainScene.setPlayerData(updatedPlayerData);
          }

          // 修复：语言切换时更新线索和NPC名称
          if (mainScene.npcManager) {
            // 重新初始化NPC以更新名称
            mainScene.npcManager.scene.playerData = updatedPlayerData;
            
            // 更新现有线索为新语言
            if (mainScene.npcManager.clueRecords) {
              mainScene.npcManager.clueRecords = mainScene.npcManager.clueRecords.map(clue => ({
                ...clue,
                clue: mainScene.npcManager.getNPCClue(clue.npcId),
                npcName: mainScene.npcManager.getNPCNameByLanguage(clue.npcId)
              }));
            }

            // 更新NPC状态和名称
            mainScene.npcManager.updateNPCStates();
          }

          // 修复：更新UIManager中的线索显示
          if (mainScene.uiManager) {
            // 清空当前线索并重新添加翻译后的线索
            if (mainScene.npcManager && mainScene.npcManager.clueRecords) {
              mainScene.uiManager.clues = [];
              mainScene.npcManager.clueRecords.forEach(clue => {
                mainScene.uiManager.addClue(clue);
              });
            }
          }

          // 如果DialogScene正在运行，也需要更新
          const dialogScene = gameRef.current.scene.getScene("DialogScene");
          if (dialogScene && dialogScene.scene.isActive()) {
            dialogScene.playerData = updatedPlayerData;
          }
        }
      } catch (error) {
        console.error("Error updating game language:", error);
      }
    }
  };

  return (
    <>
      {/* 顶部右侧控制栏 */}
      <div style={styles.topRightBar}>
        <button style={styles.button} onClick={toggleLanguage}>
        
          {playerData.language === "zh" ? "中" : "EN"}
        {/* </button>
          EN/中 */}
        </button>

        <button
          style={{
            ...styles.button,
            backgroundColor: playerData.music
              ? "rgba(34, 197, 94, 0.8)"
              : "rgba(239, 68, 68, 0.8)",
            borderColor: playerData.music ? "#22c55e" : "#ef4444",
          }}
          onClick={toggleMusic}
          title={
            playerData.music
              ? "点击关闭音乐 / Click to mute"
              : "点击开启音乐 / Click to unmute"
          }
        >
          {playerData.music ? "🎵" : "🔇"}
        </button>
      </div>
    </>
  );
}

const styles = {
  button: {
    padding: "clamp(4px, 2vw, 12px)",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    color: "white",
    border: "1px solid rgba(255, 255, 255, 0.3)",
    borderRadius: "clamp(4px, 1vw, 8px)",
    cursor: "pointer",
    fontSize: "clamp(11px, 2.5vw, 16px)",
    fontWeight: "bold",
    fontFamily: "'Courier New', monospace",
    transition: "all 0.3s ease",
    backdropFilter: "blur(10px)",
    minWidth: "clamp(35px, 8vw, 50px)",
    minHeight: "clamp(35px, 8vw, 50px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  topRightBar: {
    position: "fixed",
    top: "20px",
    right: "20px",
    display: "flex",
    gap: "10px",
    zIndex: 1000,
  },
  topLeft: {
    position: "fixed",
    top: "5px",
    left: "5px",
    zIndex: 1000,
  },
};

export default Control;