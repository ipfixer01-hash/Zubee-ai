export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "POST only"
    });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    // Check Vercel environment variable
    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing in Vercel."
      });
    }

    const body = req.body || {};

    const message =
      typeof body.message === "string"
        ? body.message.trim()
        : "";

    const history =
      Array.isArray(body.history)
        ? body.history
        : [];

    if (!message) {
      return res.status(400).json({
        error: "Message is required."
      });
    }

    /*
      Keep only valid conversation messages.
      Gemini expects roles: user / model.
    */
    const contents = [];

    for (const item of history.slice(-20)) {
      if (!item || !item.text) continue;

      const role =
        item.role === "assistant"
          ? "model"
          : "user";

      contents.push({
        role,
        parts: [
          {
            text: String(item.text)
          }
        ]
      });
    }

    // Add current message
    contents.push({
      role: "user",
      parts: [
        {
          text: message
        }
      ]
    });

    /*
      Try Flash models in order.
      If one model is unavailable, try the next one.
    */
    const models = [
      "gemini-2.5-flash-lite",
      "gemini-2.5-flash"
    ];

    let lastError = null;

    for (const model of models) {

      try {

        const url =
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

        const response = await fetch(url, {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
          },

          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text: `
You are Zubee AI, a highly capable general-purpose AI assistant.

Rules:
- Answer accurately and naturally.
- If the user uses Hinglish, reply naturally in Hinglish.
- Explain difficult concepts clearly.
- For school questions, give exam-friendly explanations.
- Do not pretend to know something if you are uncertain.
- Be concise when the question is simple.
- Give detailed answers when the user asks for detail.
- Never reveal or request the server API key.
                  `.trim()
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

        /*
          Successful Gemini response
        */
        if (response.ok) {

          const answer =
            data?.candidates?.[0]?.content?.parts
              ?.map(part => part?.text || "")
              .join("")
              .trim();

          if (answer) {
            return res.status(200).json({
              answer,
              model
            });
          }

          /*
            Gemini responded but did not provide text.
          */
          return res.status(502).json({
            error: "Gemini returned no text.",
            model,
            finishReason:
              data?.candidates?.[0]?.finishReason || null
          });
        }

        /*
          Save the real Gemini error.
        */
        lastError = {
          model,
          status: response.status,
          statusText: response.statusText,
          details: data
        };

        /*
          If it's an authentication/quota error,
          trying another model won't fix the key.
        */
        if (
          response.status === 400 ||
          response.status === 401 ||
          response.status === 403 ||
          response.status === 429
        ) {
          break;
        }

      } catch (modelError) {

        lastError = {
          model,
          error: modelError.message
        };
      }
    }

    /*
      Nothing worked.
      Return the ACTUAL Gemini error to frontend.
    */
    return res.status(502).json({
      error: "Gemini API request failed.",
      details: lastError
    });

  } catch (error) {

    console.error("Zubee backend error:", error);

    return res.status(500).json({
      error: "Zubee backend error.",
      details: error.message
    });
  }
}    
