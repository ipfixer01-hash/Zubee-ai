// Zubee AI — Vercel API
// API KEY IS NOT STORED IN THIS FILE.
// Add GEMINI_API_KEY in Vercel Environment Variables.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is not configured in Vercel."
    });
  }

  try {
    const { contents } = req.body || {};

    if (!Array.isArray(contents) || contents.length === 0) {
      return res.status(400).json({
        error: "No conversation content was provided."
      });
    }

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
      {
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
                  "You are Zubee AI, a helpful, intelligent, friendly and accurate AI assistant. Give clear answers, explain difficult topics simply, and use structured formatting when useful."
              }
            ]
          },

          contents: contents,

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
      text: text
    });

  } catch (error) {
    console.error("Zubee API error:", error);

    return res.status(500).json({
      error: error?.message || "Internal server error."
    });
  }
}
