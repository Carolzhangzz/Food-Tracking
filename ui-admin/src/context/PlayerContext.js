// src/context/PlayerContext.js
import React, { createContext, useState, useRef } from "react";

export const PlayerContext = createContext();
// playerId: 登录用的唯一ID
// playerData: 玩家存档JSON（从后端取到的）
// setPlayerId 和 setPlayerData 供其他组件调用
export function PlayerProvider({ children }) {
  const [playerId, setPlayerId] = useState(null);
  const [playerData, setPlayerData] = useState(null);
  const gameRef = useRef(null);

  return (
    <PlayerContext.Provider value={{ playerId, setPlayerId, playerData, setPlayerData, gameRef }}>
      {children}
    </PlayerContext.Provider>
  );
}
