import { setTimeout } from 'node:timers/promises';
const host = process.env.SONAR_HOST_URL ?? 'http://127.0.0.1:9000';
for (let attempt = 0; attempt < 90; attempt++) {
  try {
    const response = await fetch(`${host}/api/system/status`, { signal: AbortSignal.timeout(2000) });
    if ((await response.json()).status === 'UP') {
      console.log('Sonar is ready');
      process.exit(0);
    }
  } catch { /* The ephemeral server is still starting. */ }
  await setTimeout(2000);
}
throw new Error('Sonar did not become ready in three minutes');
