// App.js - 修复路由和响应式设计
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { PlayerProvider } from "./context/PlayerContext";
import LoginPage from "./components/LoginPage";
import LoadingPage from "./pages/LoadingPage";
import CutScenePlayer from "./components/CutScenePlayer";  // ✅ 导入 CutScenePlayer
import GameScreen from "./components/GameScreen";

function App() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <PlayerProvider>
        <div
          className="App"
          style={{
            width: "100vw",
            height: "100vh",
            overflow: "hidden",
            position: "fixed",
            top: 0,
            left: 0,
            fontFamily: "'Courier New', monospace",
          }}
        >
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/intro" element={<CutScenePlayer />} />  {/* ✅ 使用 CutScenePlayer */}
            <Route path="/loading" element={<LoadingPage />} />
            <Route path="/game" element={<GameScreen />} />
          </Routes>
        </div>
      </PlayerProvider>
    </Router>
  );
}

export default App;