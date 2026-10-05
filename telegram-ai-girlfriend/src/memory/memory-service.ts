import type { MemoryRepository } from '../database/repositories.js';
import type { Memory } from '../types/index.js';

export const MAX_MEMORY_LENGTH = 500;

/** Basic CRUD over per-user memories. Smart extraction/retrieval comes in a later phase. */
export class MemoryService {
  constructor(private readonly memories: MemoryRepository) {}

  add(userId: number, content: string, category = 'general'): Memory {
    return this.memories.create(userId, this.validate(content), category.trim() || 'general');
  }

  get(userId: number, id: number): Memory | undefined {
    return this.memories.get(userId, id);
  }

  list(userId: number): Memory[] {
    return this.memories.list(userId);
  }

  update(userId: number, id: number, content: string): boolean {
    return this.memories.update(userId, id, this.validate(content));
  }

  remove(userId: number, id: number): boolean {
    return this.memories.delete(userId, id);
  }

  clear(userId: number): number {
    return this.memories.deleteAll(userId);
  }

  private validate(content: string): string {
    const text = content.trim();
    if (!text) throw new Error('Memory content cannot be empty');
    if (text.length > MAX_MEMORY_LENGTH) throw new Error(`Memory is too long (max ${MAX_MEMORY_LENGTH})`);
    return text;
  }
}
