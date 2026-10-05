import type { Language, MessageRole } from '../types/index.js';

export interface AIChatMessage {
  role: MessageRole;
  content: string;
}

export interface AIContext {
  /** Persona + safety instructions (see personality/). */
  systemPrompt: string;
  language: Language;
  /** Recent conversation, oldest first; the last entry is the new user message. */
  messages: AIChatMessage[];
}

export interface AIResponse {
  text: string;
}

/** Provider-neutral contract. Gemini (or any other backend) implements this later. */
export interface AIProvider {
  readonly name: string;
  generateResponse(context: AIContext): Promise<AIResponse>;
}
