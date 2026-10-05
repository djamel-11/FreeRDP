import type { Db } from './connection.js';
import type {
  AgeStatus,
  Conversation,
  CreditsAccount,
  Language,
  Memory,
  MessageRole,
  StoredMessage,
  User,
  UserPreferences,
} from '../types/index.js';

interface UserRow {
  id: number;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  age_status: AgeStatus;
  age_confirmed_at: string | null;
  created_at: string;
}

const toUser = (r: UserRow): User => ({
  id: r.id,
  telegramId: r.telegram_id,
  username: r.username,
  firstName: r.first_name,
  ageStatus: r.age_status,
  ageConfirmedAt: r.age_confirmed_at,
  createdAt: r.created_at,
});

export class UserRepository {
  constructor(private readonly db: Db) {}

  findByTelegramId(telegramId: number): User | undefined {
    const row = this.db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId) as
      | UserRow
      | undefined;
    return row && toUser(row);
  }

  findById(id: number): User | undefined {
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
    return row && toUser(row);
  }

  create(telegramId: number, username: string | null, firstName: string | null): User {
    const info = this.db
      .prepare('INSERT INTO users (telegram_id, username, first_name) VALUES (?, ?, ?)')
      .run(telegramId, username, firstName);
    const row = this.db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid) as UserRow;
    return toUser(row);
  }

  updateProfile(id: number, username: string | null, firstName: string | null): void {
    this.db.prepare('UPDATE users SET username = ?, first_name = ? WHERE id = ?').run(username, firstName, id);
  }

  setAgeStatus(id: number, status: AgeStatus): void {
    this.db
      .prepare(
        `UPDATE users SET age_status = ?,
           age_confirmed_at = CASE WHEN ? = 'confirmed' THEN datetime('now') ELSE NULL END
         WHERE id = ?`,
      )
      .run(status, status, id);
  }
}

export class PreferenceRepository {
  constructor(private readonly db: Db) {}

  get(userId: number): UserPreferences {
    const row = this.db.prepare('SELECT language FROM user_preferences WHERE user_id = ?').get(userId) as
      | { language: Language | null }
      | undefined;
    return { userId, language: row?.language ?? null };
  }

  setLanguage(userId: number, language: Language): void {
    this.db
      .prepare(
        `INSERT INTO user_preferences (user_id, language) VALUES (?, ?)
         ON CONFLICT(user_id) DO UPDATE SET language = excluded.language, updated_at = datetime('now')`,
      )
      .run(userId, language);
  }
}

export class ConversationRepository {
  constructor(private readonly db: Db) {}

  create(userId: number): Conversation {
    const info = this.db.prepare('INSERT INTO conversations (user_id) VALUES (?)').run(userId);
    const row = this.db
      .prepare('SELECT id, user_id AS userId, created_at AS createdAt FROM conversations WHERE id = ?')
      .get(info.lastInsertRowid) as Conversation;
    return row;
  }

  addMessage(conversationId: number, role: MessageRole, content: string): StoredMessage {
    const info = this.db
      .prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)')
      .run(conversationId, role, content);
    return this.db
      .prepare(
        'SELECT id, conversation_id AS conversationId, role, content, created_at AS createdAt FROM messages WHERE id = ?',
      )
      .get(info.lastInsertRowid) as StoredMessage;
  }

  listMessages(conversationId: number, limit = 50): StoredMessage[] {
    return this.db
      .prepare(
        `SELECT * FROM (
           SELECT id, conversation_id AS conversationId, role, content, created_at AS createdAt
           FROM messages WHERE conversation_id = ? ORDER BY id DESC LIMIT ?
         ) ORDER BY id ASC`,
      )
      .all(conversationId, limit) as StoredMessage[];
  }
}

const MEMORY_COLUMNS =
  'id, user_id AS userId, category, content, created_at AS createdAt, updated_at AS updatedAt';

export class MemoryRepository {
  constructor(private readonly db: Db) {}

  create(userId: number, content: string, category: string): Memory {
    const info = this.db
      .prepare('INSERT INTO memories (user_id, content, category) VALUES (?, ?, ?)')
      .run(userId, content, category);
    return this.get(userId, Number(info.lastInsertRowid)) as Memory;
  }

  get(userId: number, id: number): Memory | undefined {
    return this.db
      .prepare(`SELECT ${MEMORY_COLUMNS} FROM memories WHERE id = ? AND user_id = ?`)
      .get(id, userId) as Memory | undefined;
  }

  list(userId: number): Memory[] {
    return this.db
      .prepare(`SELECT ${MEMORY_COLUMNS} FROM memories WHERE user_id = ? ORDER BY id ASC`)
      .all(userId) as Memory[];
  }

  update(userId: number, id: number, content: string): boolean {
    return (
      this.db
        .prepare("UPDATE memories SET content = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?")
        .run(content, id, userId).changes > 0
    );
  }

  delete(userId: number, id: number): boolean {
    return this.db.prepare('DELETE FROM memories WHERE id = ? AND user_id = ?').run(id, userId).changes > 0;
  }

  deleteAll(userId: number): number {
    return this.db.prepare('DELETE FROM memories WHERE user_id = ?').run(userId).changes;
  }
}

export class CreditsRepository {
  constructor(private readonly db: Db) {}

  /** Returns the account, creating a zero-balance one if missing. */
  getOrCreate(userId: number): CreditsAccount {
    this.db.prepare('INSERT OR IGNORE INTO credits (user_id) VALUES (?)').run(userId);
    return this.db
      .prepare('SELECT user_id AS userId, balance, updated_at AS updatedAt FROM credits WHERE user_id = ?')
      .get(userId) as CreditsAccount;
  }
}
