// PlayerContext.js - 更新后的玩家上下文，支持游戏进度管理
import React, { createContext, useState, useRef, useEffect } from 'react';

export const PlayerContext = createContext();

export const PlayerProvider = ({ children }) => {
  const [playerId, setPlayerId] = useState(null);
  const [playerData, setPlayerData] = useState(null);
  const [gameProgress, setGameProgress] = useState({
    currentDay: 1,
    dailyMealsRecorded: 0,
    totalMealsRequired: 3,
    completedDays: [],
    unlockedNPCs: ['village_head'],
    totalClues: 0,
    gameCompleted: false
  });
  const [foodJournal, setFoodJournal] = useState([]);
  const gameRef = useRef(null);

  // 初始化游戏进度
  useEffect(() => {
    if (playerId && playerData) {
      loadGameProgress();
    }
  }, [playerId, playerData]);

  const loadGameProgress = async () => {
    try {
      const response = await fetch('https://twilight-king-cf43.1442334619.workers.dev/api/game-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId })
      });
      
      if (response.ok) {
        const progress = await response.json();
        setGameProgress(prevProgress => ({
          ...prevProgress,
          ...progress
        }));
        console.log('Game progress loaded:', progress);
      }
    } catch (error) {
      console.error('Error loading game progress:', error);
    }
  };

  const saveGameProgress = async (progressUpdate) => {
    try {
      const newProgress = { ...gameProgress, ...progressUpdate };
      setGameProgress(newProgress);
      
      const response = await fetch('https://twilight-king-cf43.1442334619.workers.dev/api/save-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          ...newProgress
        })
      });
      
      if (response.ok) {
        console.log('Game progress saved:', newProgress);
        return true;
      }
    } catch (error) {
      console.error('Error saving game progress:', error);
    }
    return false;
  };

  const addFoodRecord = async (mealData) => {
    try {
      const response = await fetch('https://twilight-king-cf43.1442334619.workers.dev/api/record-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          ...mealData,
          timestamp: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // 更新本地食物记录
        setFoodJournal(prev => [...prev, {
          ...mealData,
          id: result.recordId,
          timestamp: new Date().toISOString()
        }]);
        
        // 更新游戏进度
        const newMealsRecorded = gameProgress.dailyMealsRecorded + 1;
        const progressUpdate = {
          dailyMealsRecorded: newMealsRecorded
        };
        
        // 检查是否完成当天任务
        if (newMealsRecorded >= gameProgress.totalMealsRequired) {
          progressUpdate.completedDays = [...gameProgress.completedDays, gameProgress.currentDay];
          
          // 如果不是最后一天，解锁下一天和下一个NPC
          if (gameProgress.currentDay < 7) {
            progressUpdate.currentDay = gameProgress.currentDay + 1;
            progressUpdate.dailyMealsRecorded = 0;
            progressUpdate.unlockedNPCs = [...gameProgress.unlockedNPCs, getNPCIdForDay(gameProgress.currentDay + 1)];
          } else {
            // 完成游戏
            progressUpdate.gameCompleted = true;
          }
        }
        
        await saveGameProgress(progressUpdate);
        return result;
      }
    } catch (error) {
      console.error('Error adding food record:', error);
    }
    return null;
  };

  const getNPCIdForDay = (day) => {
    const npcMap = {
      1: 'village_head',
      2: 'shop_owner', 
      3: 'spice_woman',
      4: 'restaurant_owner',
      5: 'fisherman',
      6: 'old_friend',
      7: 'secret_apprentice'
    };
    return npcMap[day] || null;
  };

  const getCurrentDayNPC = () => {
    return getNPCIdForDay(gameProgress.currentDay);
  };

  const isNPCUnlocked = (npcId) => {
    return gameProgress.unlockedNPCs.includes(npcId);
  };

  const addClue = (clueData) => {
    setGameProgress(prev => ({
      ...prev,
      totalClues: prev.totalClues + 1
    }));
  };

  const getTodaysMeals = () => {
    const today = new Date().toDateString();
    return foodJournal.filter(meal => 
      new Date(meal.timestamp).toDateString() === today
    );
  };

  const getGameStats = () => {
    return {
      totalDays: 7,
      completedDays: gameProgress.completedDays.length,
      currentDay: gameProgress.currentDay,
      totalMeals: foodJournal.length,
      totalClues: gameProgress.totalClues,
      progressPercentage: Math.round((gameProgress.completedDays.length / 7) * 100),
      isGameCompleted: gameProgress.gameCompleted
    };
  };

  const resetGameProgress = async () => {
    const initialProgress = {
      currentDay: 1,
      dailyMealsRecorded: 0,
      totalMealsRequired: 3,
      completedDays: [],
      unlockedNPCs: ['village_head'],
      totalClues: 0,
      gameCompleted: false
    };
    
    setGameProgress(initialProgress);
    setFoodJournal([]);
    
    try {
      await fetch('https://twilight-king-cf43.1442334619.workers.dev/api/reset-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId })
      });
    } catch (error) {
      console.error('Error resetting game progress:', error);
    }
  };

  const generateFinalEgg = async () => {
    if (!gameProgress.gameCompleted) {
      console.warn('Game not completed yet');
      return null;
    }

    try {
      const response = await fetch('https://twilight-king-cf43.1442334619.workers.dev/api/generate-final-egg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          language: playerData.language || 'en'
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        return result.eggContent;
      }
    } catch (error) {
      console.error('Error generating final egg:', error);
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
    
    // 游戏进度
    gameProgress,
    setGameProgress,
    saveGameProgress,
    loadGameProgress,
    
    // 食物记录
    foodJournal,
    setFoodJournal,
    addFoodRecord,
    getTodaysMeals,
    
    // NPC相关
    getCurrentDayNPC,
    isNPCUnlocked,
    getNPCIdForDay,
    
    // 线索和统计
    addClue,
    getGameStats,
    
    // 游戏控制
    resetGameProgress,
    generateFinalEgg,
    
    // 状态检查
    isGameCompleted: gameProgress.gameCompleted,
    canProgress: gameProgress.dailyMealsRecorded >= gameProgress.totalMealsRequired,
    currentDayProgress: {
      day: gameProgress.currentDay,
      mealsRecorded: gameProgress.dailyMealsRecorded,
      mealsRequired: gameProgress.totalMealsRequired,
      isComplete: gameProgress.dailyMealsRecorded >= gameProgress.totalMealsRequired
    }
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
};