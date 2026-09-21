import { env } from '@/lib/env';

const JEV_API_URL = 'https://api.typesafe.ai/v1/systemone';
const JEV_MODEL = 'jev-latest';

export type JevQuestion =
  | { type: 'boolean'; instructions: string }
  | { type: 'choice'; instructions: string; criteria: Record<string, string> }
  | { type: 'score'; instructions: string; criteria: string[] };

export type JevAnswer =
  | { type: 'boolean'; probability: number }
  | { type: 'choice'; choice: string }
  | { type: 'score'; score: number };

export async function evaluateWithJev<TQuestions extends Record<string, JevQuestion>>(
  state: unknown,
  questions: TQuestions,
): Promise<{ answers: Record<keyof TQuestions, JevAnswer> }> {
  const res = await fetch(JEV_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.TYPESAFE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: JEV_MODEL, state, questions }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Jev API request failed: ${res.status} ${text}`);
  }

  return res.json();
}
