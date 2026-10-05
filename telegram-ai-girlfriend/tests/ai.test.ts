import { describe, expect, it } from 'vitest';
import { MockAIProvider, type AIProvider } from '../src/ai/index.js';
import { LINA, buildSystemPrompt } from '../src/personality/index.js';

describe('AI provider abstraction', () => {
  it('mock provider satisfies the AIProvider interface', async () => {
    const provider: AIProvider = new MockAIProvider();
    const res = await provider.generateResponse({
      systemPrompt: buildSystemPrompt('fr'),
      language: 'fr',
      messages: [{ role: 'user', content: 'Salut' }],
    });
    expect(provider.name).toBe('mock');
    expect(res.text).toContain('Salut');
  });

  it('records calls', async () => {
    const mock = new MockAIProvider();
    await mock.generateResponse({ systemPrompt: 's', language: 'en', messages: [] });
    expect(mock.calls).toHaveLength(1);
  });
});

describe('personality', () => {
  it('builds a prompt with adult status, language, boundaries and memories', () => {
    const prompt = buildSystemPrompt('es', [
      { id: 1, userId: 1, category: 'general', content: 'Likes cats', createdAt: '', updatedAt: '' },
    ]);
    expect(prompt).toContain(LINA.name);
    expect(prompt).toContain('adult');
    expect(prompt).toContain('Spanish');
    expect(prompt).toContain('Never produce explicit sexual content');
    expect(prompt).toContain('Likes cats');
  });
});
