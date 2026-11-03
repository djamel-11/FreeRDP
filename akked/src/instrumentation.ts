export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  (await import('./lib/backup')).startBackupScheduler();
  (await import('./lib/jobs')).startJobs();
}
