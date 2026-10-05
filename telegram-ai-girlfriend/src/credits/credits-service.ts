import type { CreditsRepository } from '../database/repositories.js';

/** Foundation only. Spending/purchasing logic is a later phase. */
export class CreditsService {
  constructor(private readonly credits: CreditsRepository) {}

  getBalance(userId: number): number {
    return this.credits.getOrCreate(userId).balance;
  }
}
