#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { execFileSync, spawnSync } = require('child_process');

const appDir = process.env.APP_DIR || '/opt/maplens';
const dataDir = process.env.DATA_DIR || path.join(appDir, 'data');
const repo = process.env.UPDATE_REPO;
const statusFile = path.join(dataDir, 'update-status.json');
const requestFile = path.join(dataDir, 'update-request.json');

function status(state, extra = {}) {
  fs.mkdirSync(dataDir, { recursive: true });
  const temp = `${statusFile}.tmp`;
  fs.writeFileSync(temp, JSON.stringify({ state, updated_at: new Date().toISOString(), ...extra }));
  fs.renameSync(temp, statusFile);
}

async function download(url) {
  const response = await fetch(url, { headers: { Accept: 'application/octet-stream', 'User-Agent': 'MapLens-Updater' } });
  if (!response.ok) throw Error(`Download fehlgeschlagen (${response.status})`);
  return Buffer.from(await response.arrayBuffer());
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options });
  if (result.status === 0) return;
  const details = String(result.stderr || result.stdout || '').trim().split('\n').slice(-12).join('\n');
  throw Error(`${command} ${args.join(' ')} fehlgeschlagen${details ? `:\n${details}` : ''}`);
}

async function main() {
  if (process.getuid?.() !== 0) throw Error('Der Updater muss als root laufen');
  if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) throw Error('UPDATE_REPO ist nicht gültig');

  const request = JSON.parse(fs.readFileSync(requestFile, 'utf8'));
  status('checking', { target_version: request.version });
  const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'MapLens-Updater' }
  });
  if (!response.ok) throw Error(`GitHub antwortet mit ${response.status}`);
  const release = await response.json();
  const version = String(release.tag_name || '').replace(/^v/, '');
  if (version !== request.version) throw Error('Das angeforderte Release ist nicht mehr das aktuelle Release');

  const archiveAsset = release.assets.find(asset => asset.name === 'maplens.tar.gz');
  const checksumAsset = release.assets.find(asset => asset.name === 'maplens.tar.gz.sha256');
  if (!archiveAsset || !checksumAsset) throw Error('Release enthält kein verifiziertes MapLens-Paket');

  status('downloading', { target_version: version });
  const [archive, checksumData] = await Promise.all([
    download(archiveAsset.browser_download_url),
    download(checksumAsset.browser_download_url)
  ]);
  const expected = checksumData.toString('utf8').trim().split(/\s+/)[0].toLowerCase();
  const actual = crypto.createHash('sha256').update(archive).digest('hex');
  if (!/^[a-f0-9]{64}$/.test(expected) || actual !== expected) throw Error('SHA-256-Prüfsumme des Updates stimmt nicht');

  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'maplens-update-'));
  const archivePath = path.join(work, 'maplens.tar.gz');
  const source = path.join(work, 'source');
  fs.writeFileSync(archivePath, archive);
  fs.mkdirSync(source);
  execFileSync('tar', ['-xzf', archivePath, '-C', source]);
  const nextPackage = JSON.parse(fs.readFileSync(path.join(source, 'package.json'), 'utf8'));
  if (nextPackage.name !== 'maplens' || nextPackage.version !== version) throw Error('Paketversion passt nicht zum Release');

  status('backing_up', { target_version: version });
  const backupDir = path.join(appDir, 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const backup = path.join(backupDir, `maplens-${new Date().toISOString().replace(/[:.]/g, '-')}.tar.gz`);
  execFileSync('tar', ['-czf', backup, '-C', appDir, 'data']);

  status('installing', { target_version: version, backup });
  run('npm', ['ci', '--omit=dev'], { cwd: source, env: process.env });
  for (const entry of ['package.json', 'package-lock.json', 'server.js', 'install.sh', 'dev.sh', 'README.md', 'src', 'public', 'scripts', 'deploy']) {
    fs.cpSync(path.join(source, entry), path.join(appDir, entry), { recursive: true, force: true });
  }
  fs.rmSync(path.join(appDir, 'node_modules'), { recursive: true, force: true });
  fs.cpSync(path.join(source, 'node_modules'), path.join(appDir, 'node_modules'), { recursive: true });
  execFileSync('chown', ['-R', 'root:root', appDir]);
  execFileSync('chown', ['-R', 'maplens:maplens', dataDir]);
  fs.rmSync(requestFile, { force: true });
  status('complete', { target_version: version, current_version: version, backup });
  execFileSync('systemctl', ['restart', 'maplens']);
}

main().catch(error => {
  try {
    fs.rmSync(requestFile, { force: true });
    status('failed', { error: error.message });
  } catch {}
  console.error(error);
  process.exit(1);
});
