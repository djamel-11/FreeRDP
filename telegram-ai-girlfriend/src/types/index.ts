export const SUPPORTED_LANGUAGES = ['en', 'fr', 'es', 'ar'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = 'en';

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

export type AgeStatus = 'unknown' | 'confirmed' | 'denied';

export interface User {
  id: number;
  telegramId: number;
  username: string | null;
  firstName: string | null;
  ageStatus: AgeStatus;
  ageConfirmedAt: string | null;
  createdAt: string;
}

export interface UserPreferences {
  userId: number;
  language: Language | null;
}

export type MessageRole = 'user' | 'assistant';

export interface Conversation {
  id: number;
  userId: number;
  createdAt: string;
}

export interface StoredMessage {
  id: number;
  conversationId: number;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export interface Memory {
  id: number;
  userId: number;
  category: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreditsAccount {
  userId: number;
  balance: number;
  updatedAt: string;
}
