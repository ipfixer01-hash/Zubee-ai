export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  try {
    const { message, history = [] } = req.body || {};

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const contents = [
      ...history.slice(-20).map(item => ({
        role: item.role === "assistant" ? "model" : "user",
        parts: [{ text: String(item.text || "") }]
      })),
      {
        role: "user",
        parts: [{ text: String(message) }]
      }
    ];

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: `You are Zubee AI, an advanced AI assistant.
Answer accurately and clearly.
If the user speaks Hinglish, respond naturally in Hinglish.
Explain difficult things step by step.
Never invent facts.
Be helpful, concise and intelligent.`
            }]
          },
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Gemini request failed",
        details: data
      });
    }

    const answer =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("") ||
      "I couldn't generate an answer.";

    return res.status(200).json({ answer });

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}
