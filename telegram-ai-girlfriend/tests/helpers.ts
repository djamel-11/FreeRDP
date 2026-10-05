import { createRepositories, openDatabase, type Repositories } from '../src/database/index.js';
import { UserService } from '../src/services/user-service.js';

export function makeApp() {
  const db = openDatabase(':memory:');
  const repos: Repositories = createRepositories(db);
  return { db, repos, users: new UserService(repos) };
}
