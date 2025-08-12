// src/phaser/utils/guessStageFromText.js
import {clueTemplates} from "./clueTemplates";

function normalize(s) {
    return (s || "")
        .replace(/\s+/g, " ")
        .replace(/[“”"']/g, '"')
        .trim()
        .toLowerCase();
}

export function guessStageFromText(npcId, clueText) {
    if (!npcId || !clueText) return null;
    const text = normalize(clueText);
    const tpl = clueTemplates[npcId];
    if (!tpl) return null;

    for (const stage of [1, 2, 3]) {
        const arr = tpl[stage] || [];
        for (const prefix of arr) {
            const p = normalize(prefix);
            if (!p) continue;
            // 允许 startsWith 或包含（有时前面会多个引导句）
            if (text.startsWith(p) || text.includes(p)) {
                return stage;
            }
        }
    }
    return null;
}
