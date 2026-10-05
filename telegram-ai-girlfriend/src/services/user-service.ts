import type { Repositories } from '../database/index.js';
import { isLanguage, type Language, type User } from '../types/index.js';

export interface TelegramIdentity {
  telegramId: number;
  username?: string | null | undefined;
  firstName?: string | null | undefined;
}

export interface UserState {
  user: User;
  language: Language | null;
}

export class UserService {
  constructor(private readonly repos: Repositories) {}

  /** Finds or creates the user, refreshing profile fields. */
  registerUser(identity: TelegramIdentity): User {
    if (!Number.isSafeInteger(identity.telegramId) || identity.telegramId <= 0) {
      throw new Error('Invalid Telegram user id');
    }
    const username = identity.username ?? null;
    const firstName = identity.firstName ?? null;
    const existing = this.repos.users.findByTelegramId(identity.telegramId);
    if (existing) {
      this.repos.users.updateProfile(existing.id, username, firstName);
      return { ...existing, username, firstName };
    }
    const user = this.repos.users.create(identity.telegramId, username, firstName);
    this.repos.credits.getOrCreate(user.id);
    return user;
  }

  getState(telegramId: number): UserState | undefined {
    const user = this.repos.users.findByTelegramId(telegramId);
    if (!user) return undefined;
    return { user, language: this.repos.preferences.get(user.id).language };
  }

  /** Records 18+ confirmation. A previous "under 18" answer is final and cannot be overturned. */
  confirmAdult(userId: number): boolean {
    const user = this.mustGet(userId);
    if (user.ageStatus === 'denied') return false;
    this.repos.users.setAgeStatus(userId, 'confirmed');
    return true;
  }

  /** Records an under-18 answer. Access is blocked permanently. */
  denyAge(userId: number): void {
    this.mustGet(userId);
    this.repos.users.setAgeStatus(userId, 'denied');
  }

  /** Language can only be chosen after the 18+ confirmation. */
  setLanguage(userId: number, language: string): boolean {
    if (!isLanguage(language)) throw new Error('Unsupported language');
    const user = this.mustGet(userId);
    if (user.ageStatus !== 'confirmed') return false;
    this.repos.preferences.setLanguage(userId, language);
    return true;
  }

  /** True only when the user is an age-confirmed adult who finished onboarding. */
  canAccessChat(telegramId: number): boolean {
    const state = this.getState(telegramId);
    return state?.user.ageStatus === 'confirmed' && state.language !== null;
  }

  private mustGet(userId: number): User {
    const row = this.repos.users.findById(userId);
    if (!row) throw new Error('User not found');
    return row;
  }
}
