// src/context/AudioContext.js
import React, { createContext, useState } from "react";

export const AudioContext = createContext();


// musicEnabled: true / false
// 右上角开关按钮调用 setMusicEnabled


export function AudioProvider({ children }) {
  const [musicEnabled, setMusicEnabled] = useState(true);

  return (
    <AudioContext.Provider value={{ musicEnabled, setMusicEnabled }}>
      {children}
    </AudioContext.Provider>
  );
}

