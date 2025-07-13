 # GPTRPG
 
GPTRPG is a simple pixel-style RPG prototype that supports a human-controlled character and an LLM-enabled AI agent that interacts with the environment. The project is built with React, Phaser, and Grid Engine, and is connected to the OpenAI API for the agent’s behavior. This repo includes: a dynamic game world rendered in Phaser, a controllable human character, an AI agent connected via WebSocket, NPC dialog and scene transitions, and support for OpenAI-based decision-making logic.

## 🛠️ Getting Started

1. Clone the project  
   `git clone https://github.com/Carolzhangzz/Food-Tracking.git && cd Food-Tracking`  
2. Install dependencies  
   `npm install`  
3. Set up OpenAI API key  
   Rename `agent/env.example.json` to `env.json`:  
   `mv agent/env.example.json agent/env.json`  
   Then open `agent/env.json` and fill in your API key like this:  
   `{ "OPENAI_API_KEY": "your-api-key-here" }`  
4. Start the AI Agent server  
   `cd agent && node ServerAgent.js`  
5. Start the game frontend (in a new terminal tab)  
   `cd gptrpg npm start`  
6. Open your browser and visit `http://localhost:3000`

✅ This project has been tested on Node.js v16.19.0

## 🎮 Game Overview

The game opens with a cinematic dialog scene accompanied by background music, followed by the main village map.

### Environment

The environment is built using Tiled (map files in `ui-admin/src/assets`), rendered using Phaser and Grid Engine. The player character is controlled using arrow or WASD keys. Use `SPACE` to talk to NPCs, `S` to plant, and `D` to harvest. The frontend lives in the `ui-admin` directory and is a standard React app.

### AI Agent

The AI agent lives in the `agent` directory and connects via WebSocket to the frontend. It uses the OpenAI GPT-3.5-turbo API to decide on its actions, which are based on its surroundings and its internal state (currently only sleepiness). Communication happens through JSON messages.

## 📦 Upcoming Features

Multi-agent support, inventory and goal system, emotional/memory tracking, expanded action list (eat, drink, rest, write, etc.), human-agent dialogue system, UI/UX improvements, and web deployment support.

## ⚠️ Note

Do not commit your OpenAI key. The `env.json` file is ignored by Git to protect credentials.
