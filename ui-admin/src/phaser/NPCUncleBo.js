// NPCUncleBo.js - Uncle Bo NPC
import NPCBase from './NPCBase.js';

export default class NPCUncleBo extends NPCBase {
  constructor(scene) {
    super(scene, {
      id: 'uncle_bo',
      name: 'Uncle Bo',
      position: { x: 1, y: 7 },
      spriteKey: 'npc',
      isUnlocked: true // 第一个NPC默认解锁
    });
  }

  getClue() {
    const language = this.scene.playerData.language;
    if (language === 'zh') {
      return "三天前，他不声不响地离开了村子。他厨房里的火还是温的，但人已经不见了。你应该知道...他从来不是那种会无缘无故消失的人。";
    } else {
      return "Three days ago, he left the village without a word. The fire in his kitchen was still warm—but he was gone. You know as well as I do… he was never the kind to vanish without a reason.";
    }
  }

  getInitialGreeting() {
    const language = this.scene.playerData.language;
    if (language === 'zh') {
      return "你好！我是博叔。你终于回来了...我们需要谈谈你师父的事情。";
    } else {
      return "Hello! I'm Uncle Bo. You're finally back... We need to talk about your master.";
    }
  }
}