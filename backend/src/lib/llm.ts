import OpenAI from 'openai';

// OpenRouter with a reliable free text model — no image decoding issues
// google/gemma-4-26b-a4b-it:free supports text well and is confirmed free
const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || '',
  defaultHeaders: {
    'HTTP-Referer': 'https://taskflow.app',
    'X-Title': 'TaskFlow Academic Task Manager',
  },
});

const MODEL = 'google/gemma-4-26b-a4b-it:free';

export interface TaskAnalysis {
  description: string;
  taskType: string;
  wordCount: number | null;
  deadline: string | null;
  university: string | null;
  stages: string[];
}

const SYSTEM_PROMPT = `You are an academic task analyser. Extract structured information from assignment details and return ONLY valid JSON:
{
  "description": "<concise summary of what must be done>",
  "taskType": "<one of: ESSAY | POWERPOINT | SPSS | QUESTIONNAIRE | LONG_TERM | MIXED>",
  "wordCount": <integer or null>,
  "deadline": "<ISO 8601 date e.g. 2024-12-31, or null>",
  "university": "<full university name, or null if not mentioned>",
  "stages": ["stage1", "stage2"]
}
Rules:
- wordCount: extract or estimate for ESSAY/SPSS/QUESTIONNAIRE/MIXED/LONG_TERM (e.g. "10 pages ≈ 2500 words"). null for POWERPOINT.
- university: check all text for university name, faculty, course code. null only if truly absent.
- stages: only for LONG_TERM tasks. Empty array otherwise.
Return raw JSON only — no markdown fences, no extra keys.`;

function parseResult(raw: string): TaskAnalysis {
  const cleaned = raw.trim().replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '');
  return JSON.parse(cleaned) as TaskAnalysis;
}

async function callLLM(userMessage: string): Promise<TaskAnalysis> {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: userMessage },
    ],
    max_tokens: 600,
    temperature: 0.1,
  });
  const raw = response.choices[0]?.message?.content ?? '{}';
  return parseResult(raw);
}

/**
 * Analyse uploaded files — pass filenames as text context.
 * The distributor's typed description (rawPrompt) is the primary signal.
 */
export async function analyseTaskFiles(
  files: Array<{ localPath: string; mimeType: string; fileName: string }>
): Promise<TaskAnalysis> {
  const fileList = files
    .map(f => `- ${f.fileName} (${f.mimeType})`)
    .join('\n');

  return callLLM(
    `The following files were uploaded for a university assignment:\n${fileList}\n\nInfer the task type, word count, deadline, and university from the filenames and context above.`
  );
}

/**
 * Analyse from plain text description typed by the distributor — most accurate path.
 */
export async function analyseTaskText(text: string): Promise<TaskAnalysis> {
  return callLLM(`Analyse this assignment description:\n\n${text}`);
}
