require('dotenv').config();
(async () => {
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const prompt = "Return a strict JSON: {\"hello\":\"world\"}";
  const result = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { temperature: 0.1, maxOutputTokens: 50 }
  });

  const text = (result?.response?.text && (await result.response.text()))
            || result?.text
            || (result?.response?.candidates?.[0]?.content?.parts || [])
                .map(p=>p.text||"").join("");

  console.log("RAW:", text);
})();
