// Node-only startup work (background jobs). Kept out of instrumentation.ts so the Edge compile never sees node:* imports.
import { startBackupScheduler } from './lib/backup';
import { startJobs } from './lib/jobs';

startBackupScheduler();
startJobs();
