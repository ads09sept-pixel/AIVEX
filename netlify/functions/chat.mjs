const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

export default async (req) => {
  if (req.method === "OPTIONS") return new Response("", { status: 204, headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Use POST." }), { status: 405, headers: cors });

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return new Response(JSON.stringify({ error: "AIVEX is not connected yet. Add GEMINI_API_KEY in Netlify environment variables, then redeploy." }), { status: 503, headers: cors });

    const body = await req.json();
    const messages = Array.isArray(body.messages) ? body.messages.slice(-16) : [];
    const userMessage = messages[messages.length - 1];
    if (!userMessage || userMessage.role !== "user") {
      return new Response(JSON.stringify({ error: "Please send a message." }), { status: 400, headers: cors });
    }

    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [
        ...(m.text ? [{ text: String(m.text).slice(0, 30000) }] : []),
        ...(m.images || []).slice(0, 4).map((img) => ({
          inline_data: { mime_type: img.mimeType, data: img.data }
        }))
      ]
    })).filter((m) => m.parts.length);

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const useSearch = process.env.ENABLE_GOOGLE_SEARCH !== "false" && body.webSearch === true;
    const payload = {
      system_instruction: {
        parts: [{ text: "You are AIVEX, a capable, friendly, clear and honest AI assistant. Your tagline is One AI. Endless Possibilities. Give useful, well-structured answers. Adapt to the user's level. Explain uncertainty instead of inventing facts. For current information, use Google Search grounding when it is enabled. Never claim to have performed actions you did not perform." }]
      },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
    };
    if (useSearch) payload.tools = [{ google_search: {} }];

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await upstream.json();

    if (!upstream.ok) {
      const msg = data?.error?.message || "The AI provider returned an error.";
      return new Response(JSON.stringify({ error: msg }), { status: upstream.status, headers: cors });
    }

    const answer = (data.candidates?.[0]?.content?.parts || [])
      .map((p) => p.text || "")
      .join("\n").trim();

    const grounding = data.candidates?.[0]?.groundingMetadata;
    const sources = (grounding?.groundingChunks || []).map((chunk) => chunk.web).filter((x) => x?.uri).map((x) => ({
      title: x.title || x.uri, url: x.uri
    }));

    return new Response(JSON.stringify({ answer: answer || "I couldn't generate a response. Please try again.", sources }), { status: 200, headers: cors });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || "Unexpected server error." }), { status: 500, headers: cors });
  }
};
