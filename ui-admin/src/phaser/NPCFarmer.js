// NPCFarmer.js - 农夫NPC (第二天)
import NPCBase from './NPCBase.js';

export default class NPCFarmer extends NPCBase {
  constructor(scene) {
    super(scene, {
      id: 'farmer',
      name: 'Farmer Joe',
      position: { x: 8, y: 3 },
      spriteKey: 'npc',
      isUnlocked: false // 需要第一个NPC完成后才解锁
    });
  }

  getClue() {
    const language = this.scene.playerData.language;
    if (language === 'zh') {
      return "你师父经常在这里买新鲜蔬菜。上周他问我有没有特殊的香料，说是要做一道失传的菜。我告诉他去找老李，他那里有稀有的调料。";
    } else {
      return "Your master often bought fresh vegetables here. Last week he asked me if I had any special spices, said he wanted to make a lost recipe. I told him to find Old Li, he has rare seasonings.";
    }
  }

  getInitialGreeting() {
    const language = this.scene.playerData.language;
    if (language === 'zh') {
      return "你好！我是农夫乔。你师父是我的老顾客，听说他失踪了...真是令人担心。";
    } else {
      return "Hello! I'm Farmer Joe. Your master was a regular customer, heard he went missing... quite worrying.";
    }
  }
}