import { cp, mkdir, mkdtemp, rm, symlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';

const project = process.cwd();
// Vinext 1.0 detects wrangler.jsonc and requires the Cloudflare plugin even for
// a Node build. Docker excludes that file; local verification uses the same
// source inputs in a temporary directory without modifying the working tree.
let staging;
let buildRoot = project;
if (existsSync(join(project, 'wrangler.jsonc'))) {
  const parent = resolve(project, 'artifacts');
  await mkdir(parent, { recursive: true });
  staging = await mkdtemp(join(parent, 'docker-build-'));
  buildRoot = staging;
  for (const input of ['app', 'components', 'hooks', 'lib', 'public', 'package.json', 'vite.config.ts', 'next.config.ts', 'tsconfig.json']) {
    await cp(join(project, input), join(staging, input), { recursive: true });
  }
  await symlink(join(project, 'node_modules'), join(staging, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
}
try {
  const child = spawn(process.execPath, [join(project, 'node_modules/vite/bin/vite.js'), 'build', '--mode', 'docker'], {
    cwd: buildRoot, stdio: 'inherit',
  });
  const code = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', resolve);
  });
  if (code !== 0) throw new Error(`Docker-target build failed (${code})`);
  if (staging) {
    if (dirname(resolve(staging)) !== resolve(project, 'artifacts')) {
      throw new Error('Refusing cleanup outside the temporary build directory');
    }
    await rm(join(project, 'dist'), { recursive: true, force: true });
    await cp(join(staging, 'dist'), join(project, 'dist'), { recursive: true });
  }
} finally {
  if (staging) {
    // Remove the junction first; never recursively traverse node_modules.
    await rm(join(staging, 'node_modules'), { force: true });
    await rm(staging, { recursive: true, force: true });
  }
}
