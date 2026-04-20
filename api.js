const API_KEY = 'AIzaSyBLTCvRz1SVEhJshJpq-29sXgO2w3aaw7A';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${API_KEY}`;

/**
 * Helper function to call the Gemini API
 */
async function callGemini(promptText, useJSON = false) {
  try {
    const payload = {
      contents: [{
        parts: [{ text: promptText }]
      }],
      generationConfig: {
        temperature: 0.7,
      }
    };

    if (useJSON) {
      payload.generationConfig.responseMimeType = "application/json";
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || 'Failed to fetch from Gemini API');
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
}

/**
 * Generates a summary formatted in Markdown
 */
export async function generateSummary(text) {
  const prompt = `You are a helpful educational assistant. 
Please create a comprehensive and easy-to-read summary of the following class notes. 
Use markdown formatting (like headings, bullet points, and bold text) to make it visually appealing and structured. 
Highlight key terms.

Notes:
${text}`;

  return await callGemini(prompt, false);
}

/**
 * Generates flashcards returned as JSON
 */
export async function generateFlashcards(text) {
  const prompt = `You are an expert tutor. Create exactly 10 flashcards based on the following notes.
Output MUST be a valid JSON array of objects, with each object having a "front" (the question or concept) and a "back" (the concise answer or definition).
Do not include any surround markdown like \`\`\`json. Return strictly the JSON array.

Example format:
[
  { "front": "What is Mitochondria?", "back": "The powerhouse of the cell." }
]

Notes to use:
${text}`;

  const jsonText = await callGemini(prompt, true);
  try {
    return JSON.parse(jsonText);
  } catch (e) {
    // Attempt fallback parsing if formatting is slightly off
    const stringData = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(stringData);
  }
}

/**
 * Generates a quiz returned as JSON
 */
export async function generateQuiz(text) {
  const prompt = `You are an expert examiner. Create a 5-question multiple choice quiz based on the following notes.
Output MUST be a valid JSON array of objects.
Each object must have:
- "question": string
- "options": an array of exactly 4 strings
- "correctAnswer": integer (the index 0-3 of the correct option in the options array)
- "explanation": a brief explanation of why the answer is correct

Do not include any surround markdown like \`\`\`json. Return strictly the JSON array.

Example format:
[
  {
    "question": "What is 2+2?",
    "options": ["1", "2", "3", "4"],
    "correctAnswer": 3,
    "explanation": "Because two plus two equals four."
  }
]

Notes to use:
${text}`;

  const jsonText = await callGemini(prompt, true);
  try {
    return JSON.parse(jsonText);
  } catch (e) {
    const stringData = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(stringData);
  }
}
