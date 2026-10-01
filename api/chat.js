export default async function handler(req, res) {
res.setHeader("Access-Control-Allow-Origin", "*");
res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
res.setHeader("Access-Control-Allow-Headers", "Content-Type");

if (req.method === "OPTIONS") {
return res.status(204).end();
}

if (req.method !== "POST") {
return res.status(405).json({ error: "POST only" });
}

// =====================================================
// 🔑 PUT YOUR NEW GEMINI API KEY BETWEEN THE QUOTES
// =====================================================
const API_KEY = "AQ.Ab8RN6Ky8XNF09oa8dq1ZLoKuiUkcXFLy02QLpbHDGjcL26PLA";
// =====================================================

if (
!API_KEY ||
API_KEY === "AQ.Ab8RN6Ky8XNF09oa8dq1ZLoKuiUkcXFLy02QLpbHDGjcL26PLA"
) {
return res.status(500).json({
error: "Gemini API key has not been added."
});
}

try {
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

const contents = [];  

for (const item of history.slice(-20)) {  
  if (!item || !item.text) continue;  

  contents.push({  
    role:  
      item.role === "assistant"  
        ? "model"  
        : "user",  

    parts: [  
      {  
        text: String(item.text)  
      }  
    ]  
  });  
}  

contents.push({  
  role: "user",  
  parts: [  
    {  
      text: message  
    }  
  ]  
});  

const response = await fetch(  
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",  
  {  
    method: "POST",  

    headers: {  
      "Content-Type": "application/json",  
      "x-goog-api-key": API_KEY  
    },  

    body: JSON.stringify({  
      systemInstruction: {  
        parts: [  
          {  
            text: `

You are Zubee AI.

You are a highly capable, intelligent and friendly AI assistant.

Rules:

Answer accurately.

Be helpful and natural.

If the user speaks Hinglish, respond naturally in Hinglish.

Explain difficult topics step by step.

For Class 10 questions, give clear exam-friendly explanations.

Do not invent facts.

Keep simple questions concise.

Give detailed answers when the user asks for detail.
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
}

);

const data = await response.json();

if (!response.ok) {
return res.status(response.status).json({
error: "Gemini API request failed.",
details:
data?.error?.message ||
JSON.stringify(data)
});
}

const answer =
data?.candidates?.[0]?.content?.parts
?.map(part => part?.text || "")
.join("")
.trim();

if (!answer) {
return res.status(502).json({
error: "Gemini returned no answer."
});
}

return res.status(200).json({
answer
});

} catch (error) {

return res.status(500).json({
error: "Zubee backend error.",
details: error.message
});
}
}
