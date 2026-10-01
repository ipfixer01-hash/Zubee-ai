// api/chat.js
// Zubee AI — Gemini 2.5 Flash-Lite
// API key is NOT stored in this file.
// Add GEMINI_API_KEY in Vercel Environment Variables.

const MODEL = "gemini-2.5-flash-lite";

const ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error:
        "GEMINI_API_KEY is missing. Add it in Vercel → Settings → Environment Variables."
    });
  }

  try {
    const { contents, mode } = req.body || {};

    if (!Array.isArray(contents) || contents.length === 0) {
      return res.status(400).json({
        error: "No conversation content was provided."
      });
    }

    let modeInstruction = "";

    switch (mode) {
      case "⚡ Fast":
        modeInstruction =
          "Answer quickly and directly. Keep unnecessary details low.";
        break;

      case "🧠 Smart":
        modeInstruction =
          "Give accurate, well-reasoned and detailed answers when necessary.";
        break;

      case "💻 Code":
        modeInstruction =
          "Act as an expert programmer. Give clean, secure and runnable code. Explain important parts.";
        break;

      case "📚 Study":
        modeInstruction =
          "Act as an excellent teacher. Explain step-by-step using simple language, examples and exam-focused points when useful.";
        break;

      case "🎨 Creative":
        modeInstruction =
          "Be creative, original, engaging and practical.";
        break;

      default:
        modeInstruction =
          "Give a helpful, accurate and natural answer.";
    }

    const response = await fetch(ENDPOINT, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },

      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text:
                `You are Zubee AI, a friendly and intelligent AI assistant.

Be helpful, accurate and honest.
Understand the user's intent before answering.
Use clear formatting when useful.
Do not unnecessarily repeat the question.

Current mode:
${modeInstruction}`
            }
          ]
        },

        contents,

        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          `Gemini API request failed with status ${response.status}.`
      });
    }

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim();

    if (!text) {
      return res.status(502).json({
        error: "Gemini returned an empty response."
      });
    }

    return res.status(200).json({
      text
    });

  } catch (error) {
    console.error("Zubee server error:", error);

    return res.status(500).json({
      error:
        error?.message ||
        "Something went wrong while contacting Gemini."
    });
  }
}
