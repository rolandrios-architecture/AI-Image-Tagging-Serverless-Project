const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");

const client = new BedrockRuntimeClient({ region: "us-east-1" });

// 🔧 Helper: extract JSON safely from LLM response
const extractJSON = (text) => {
  // Remove markdown if exists
  const clean = text.replaceAll(/```json|```/g, "");

  // Extract first JSON object
  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch (err) {
    console.error("JSON parse failed. Raw output:", text, err);
    return null;
  }
};

exports.generateDescription = async (labels) => {
  try {
    // 🔧 Normalize labels input
    let labelNames = [];
    if (Array.isArray(labels)) {
      labelNames = labels.map((l) => (typeof l === "string" ? l : l.name)).filter(Boolean);
    } else {
      labelNames = labels?.Labels?.map((l) => l.Name) ?? [];
    }

    //Strong prompt (anti-hallucination)
    const prompt = `
You are a strict image analysis system.

You are given detected objects from an image:
${labelNames.join(", ")}

Rules:
- Use ONLY the provided labels as factual grounding
- You MAY enhance the description with natural, vivid language
- Do NOT introduce objects that are not in the labels
- Write a natural, slightly evocative sentence (1 sentence)
- Keep it concise but descriptive
- Output ONLY valid JSON

Format:
{
  "description": "...",
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

 let text = "";

if (
  responseBody &&
  Array.isArray(responseBody.content) &&
  responseBody.content.length > 0 &&
  responseBody.content[0] &&
  responseBody.content[0].text
) {
  text = responseBody.content[0].text;
} else {
  console.error("Unexpected Bedrock response:", JSON.stringify(responseBody));
}

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
    console.error("generateDescription failed:", err);

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