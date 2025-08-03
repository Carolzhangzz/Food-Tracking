// PlayerContext.js - 简化版本，删除冗余代码
import React, { createContext, useState, useRef } from "react";

export const PlayerContext = createContext();

export const PlayerProvider = ({ children }) => {
  const [playerId, setPlayerId] = useState(null);
  const [playerData, setPlayerData] = useState(null);
  const gameRef = useRef(null);

  // 基础的工具函数
  const getNPCIdForDay = (day) => {
    const npcMap = {
      1: "village_head",
      2: "shop_owner",
      3: "spice_woman",
      4: "restaurant_owner",
      5: "fisherman",
      6: "old_friend",
      7: "secret_apprentice",
    };
    return npcMap[day] || null;
  };

  // 最终彩蛋生成（游戏完成时使用）
  const generateFinalEgg = async () => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/generate-final-egg`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerId,
            language: playerData?.language || "en",
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        return result.eggContent;
      }
    } catch (error) {
      console.error("Error generating final egg:", error);
    }
    return null;
  };

  const value = {
    // 基础数据
    playerId,
    setPlayerId,
    playerData,
    setPlayerData,
    gameRef,

    // 保留的工具函数
    getNPCIdForDay,
    generateFinalEgg,
  };

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
};
