import type { AIContext, AIProvider, AIResponse } from './provider.js';

const REPLIES = {
  en: 'Mock reply to: ',
  fr: 'Réponse simulée à : ',
  es: 'Respuesta simulada a: ',
  ar: 'رد تجريبي على: ',
} as const;

/** Deterministic offline provider for tests and local development. Makes no network calls. */
export class MockAIProvider implements AIProvider {
  readonly name = 'mock';
  readonly calls: AIContext[] = [];

  async generateResponse(context: AIContext): Promise<AIResponse> {
    this.calls.push(context);
    const last = [...context.messages].reverse().find((m) => m.role === 'user');
    return { text: `${REPLIES[context.language]}${last?.content ?? ''}` };
  }
}
