import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body || {};
    const prompt = body.prompt;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        /* your messages exactly as-is */
      ],
      // ❌ response_format REMOVED
    });

    console.log("Completion received");

    const msg = completion.choices?.[0]?.message;
    const raw = (msg?.content ?? "").trim();

    const json = JSON.parse(raw);
    return res.json(json);

  } catch (err) {
    console.error("Handler crash:", err);
    return res.status(500).json({
      error: "Failed to generate schema",
      details: err.message,
    });
  }
}
