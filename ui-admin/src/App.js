import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./components/LoginPage";
import MainMenu from "./components/MainMenu";
import GameScreen from "./components/GameScreen";
import CutScenePlayer from "./components/CutScenePlayer";
import { PlayerProvider } from "./context/PlayerContext";
import { LanguageProvider } from "./context/LanguageContext";
import { AudioProvider } from "./context/AudioContext";
import "./App.css";


import "./App.css";

function App() {
  return (
    <PlayerProvider> 
      <LanguageProvider>
        <AudioProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route path="/menu" element={<MainMenu />} />
              <Route path="/intro" element={<CutScenePlayer />} />
              <Route path="/game" element={<GameScreen />} />
            </Routes>  
          </BrowserRouter>
        </AudioProvider>
      </LanguageProvider>
    </PlayerProvider>
  );
}

export default App;
