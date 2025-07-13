// src/context/LanguageContext.js
import React, { createContext, useState } from "react";

export const LanguageContext = createContext();
// language 是 "en" 或 "zh"
// 可以在右上角切换语言按钮调用 setLanguage


export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState("en"); // 默认英文

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}
