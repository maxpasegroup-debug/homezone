// Cached debug compilation/packaging only. Does not install, launch or contact APIs.
import { readFileSync, statSync, existsSync, mkdirSync, copyFileSync, writeFileSync, constants } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { validateServiceConfig } from './service-config.mjs';

const args = process.argv.slice(2), options = new Map();
for (let i = 0; i < args.length; i += 2) {
  if (!['--mode', '--config'].includes(args[i]) || !args[i + 1] || options.has(args[i])) {
    throw Error('Use --mode preview, or --mode service --config config/<environment>.local.json.');
  }
  options.set(args[i], args[i + 1]);
}
const mode = options.get('--mode');
if (!['preview', 'service'].includes(mode) || (mode === 'preview' && options.has('--config')) ||
    (mode === 'service' && !options.has('--config'))) throw Error('Choose an explicit preview or service build.');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let settings = { HOMEZONE_ENABLE_API: false };
if (mode === 'service') {
  const path = resolve(root, options.get('--config'));
  if (statSync(path).size > 4096) throw Error('Configuration exceeds the nonsecret settings limit.');
  settings = validateServiceConfig(JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, '')), { android: true });
}
const artifact = resolve(root, 'build/app/outputs/apk/debug/app-debug.apk');
const stamp = `${new Date().toISOString().replace(/[:.]/g, '-')}-${process.pid}`;
const evidence = resolve(root, 'build/android-source-builds', stamp);
mkdirSync(evidence, { recursive: true });
if (existsSync(artifact)) copyFileSync(artifact, resolve(evidence, 'previous-app-debug.apk'), constants.COPYFILE_EXCL);
const defines = Object.entries(settings).map(([k, v]) => Buffer.from(`${k}=${v}`).toString('base64')).join(',');
const gradleArgs = ['--offline', '--console=plain', '--max-workers=1', '-Ptarget=lib/main.dart',
  '-Ptarget-platform=android-arm,android-arm64,android-x64', `-Pdart-defines=${defines}`, 'assembleDebug'];
const started = Date.now();
// Windows batch execution needs cmd; its command contains only fixed arguments
// and base64 defines. No path, origin or user-entered text is interpolated raw.
const windows = process.platform === 'win32';
const command = windows ? 'cmd.exe' : './gradlew';
const commandArgs = windows ? ['/d', '/s', '/c', `gradlew.bat ${gradleArgs.join(' ')}`] : gradleArgs;
const result = spawnSync(command, commandArgs, {
  cwd: resolve(root, 'android'), shell: false, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
  env: { ...process.env, CI: 'true', FLUTTER_SUPPRESS_ANALYTICS: 'true', DART_SUPPRESS_ANALYTICS: 'true' }
});
writeFileSync(resolve(evidence, 'gradle.log'), (result.stdout ?? '') + (result.stderr ?? ''), { flag: 'wx' });
if (result.error || result.status !== 0) {
  process.stderr.write('Build failed. Existing APKs are not evidence of this build; inspect the local gradle.log.\n');
  process.exit(result.status || 1);
}
if (!existsSync(artifact)) throw Error('Build did not produce an APK.');
const bytes = readFileSync(artifact);
const record = { mode, environment: settings.HOMEZONE_API_ENV ?? 'offline-preview',
  apiOrigin: settings.HOMEZONE_API_BASE_URL ?? null, variant: 'debug',
  abis: ['armeabi-v7a', 'arm64-v8a', 'x86_64'], artifact, bytes: bytes.length,
  sha256: createHash('sha256').update(bytes).digest('hex'),
  freshlyWritten: statSync(artifact).mtimeMs >= started - 2000,
  runtimeVerified: false, liveServiceVerified: false };
writeFileSync(resolve(evidence, 'build-record.json'), JSON.stringify(record, null, 2) + '\n', { flag: 'wx' });
process.stdout.write(JSON.stringify(record, null, 2) + '\n');
