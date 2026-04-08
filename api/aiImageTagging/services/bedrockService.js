const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

const client = new BedrockRuntimeClient({ region: "us-east-1" });

// 🔧 Helper: extract JSON safely from LLM response
const extractJSON = (text) => {
  try {
    // Remove markdown if exists
    const clean = text.replace(/```json|```/g, "");

    // Extract first JSON object
    const match = clean.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON found");

    return JSON.parse(match[0]);
  } catch (err) {
    console.error("❌ JSON parse failed. Raw output:", text);
    return null;
  }
};

exports.generateDescription = async (labels) => {
  try {
    // 🔧 Normalize labels input
    const labelNames = Array.isArray(labels)
      ? labels.map((l) => (typeof l === "string" ? l : l.name)).filter(Boolean)
      : (labels && labels.Labels)
      ? labels.Labels.map((l) => l.Name)
      : [];

    // 🔒 Strong prompt (anti-hallucination)
    const prompt = `
You are a strict image analysis system.

You are given detected objects from an image:
${labelNames.join(", ")}

Rules:
- Only use the provided labels
- Do NOT invent or assume anything
- Do NOT add artistic or abstract descriptions
- Write a natural, concise sentence (not a list)
- Output ONLY valid JSON (no extra text)

Format:
{
  "description": "short factual sentence",
  "tags": ["tag1", "tag2"]
}
`;

    const command = new InvokeModelCommand({
      modelId: "anthropic.claude-3-haiku-20240307-v1:0",
      contentType: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    const response = await client.send(command);

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    const text = responseBody.content?.[0]?.text || "";

    // 🧠 Safe parsing
    const parsed = extractJSON(text);

    if (!parsed) {
      // 🔁 fallback deterministic
      return {
        description: `Image contains: ${labelNames.join(", ")}`,
        tags: labelNames.map((l) => l.toLowerCase()),
      };
    }

    return parsed;
  } catch (err) {
    console.error("🔥 generateDescription failed:", err);

    // 🔁 fallback total
    const labelNames = Array.isArray(labels)
      ? labels.map((l) => (typeof l === "string" ? l : l.name)).filter(Boolean)
      : [];

    return {
      description: `Image contains: ${labelNames.join(", ")}`,
      tags: labelNames.map((l) => l.toLowerCase()),
    };
  }
};