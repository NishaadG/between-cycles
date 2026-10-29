import "server-only";

// Reads an ingredient list from a photo of a product label with a vision
// model. The model only transcribes; the verdicts come from the fixed rules
// in ingredients.ts, after the person has checked the transcription.

const KEY = process.env.GEMINI_API_KEY || "";
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export const labelReaderAvailable = () => KEY.length > 0;

export interface LabelReading {
  productName: string;
  ingredients: string[];
  legible: boolean;
  note: string;
}

const PROMPT = `You are transcribing a cosmetic or skincare product label.
Return the product name if visible, and the ingredient list (INCI) exactly as printed, one ingredient per array item, in the printed order.
Do not add, guess or correct ingredients. If part of the list is cut off or unreadable, set legible to false and say which part in note.
If there is no ingredient list in the photo, return an empty array and explain in note.`;

const SCHEMA = {
  type: "OBJECT",
  properties: {
    productName: { type: "STRING" },
    ingredients: { type: "ARRAY", items: { type: "STRING" } },
    legible: { type: "BOOLEAN" },
    note: { type: "STRING" },
  },
  required: ["productName", "ingredients", "legible", "note"],
};

export async function readLabel(bytes: Buffer, mimeType: string): Promise<LabelReading> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
    body: JSON.stringify({
      contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: mimeType, data: bytes.toString("base64") } }] }],
      generationConfig: { temperature: 0, responseMimeType: "application/json", responseSchema: SCHEMA },
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`label reader ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  const text: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  const parsed = JSON.parse(text) as Partial<LabelReading>;
  // Validate in code rather than trusting the model's shape.
  const ingredients = Array.isArray(parsed.ingredients)
    ? parsed.ingredients.map((x) => String(x).trim()).filter((x) => x.length > 1 && x.length < 120).slice(0, 80)
    : [];
  return {
    productName: String(parsed.productName ?? "").slice(0, 100),
    ingredients,
    legible: Boolean(parsed.legible) && ingredients.length > 0,
    note: String(parsed.note ?? "").slice(0, 300),
  };
}
