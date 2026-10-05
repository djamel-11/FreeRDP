import type { Db } from './connection.js';
import {
  ConversationRepository,
  CreditsRepository,
  MemoryRepository,
  PreferenceRepository,
  UserRepository,
} from './repositories.js';

export { openDatabase, type Db } from './connection.js';

export interface Repositories {
  users: UserRepository;
  preferences: PreferenceRepository;
  conversations: ConversationRepository;
  memories: MemoryRepository;
  credits: CreditsRepository;
}

export function createRepositories(db: Db): Repositories {
  return {
    users: new UserRepository(db),
    preferences: new PreferenceRepository(db),
    conversations: new ConversationRepository(db),
    memories: new MemoryRepository(db),
    credits: new CreditsRepository(db),
  };
}
