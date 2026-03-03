const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const ROOT = path.resolve(__dirname, '..')
const SRC_DIR = path.join(ROOT, 'src')
const OUT_DIR = path.join(ROOT, 'miniprogram')
const WATCH_MODE = process.argv.includes('--watch')

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' })
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`${cmd} ${args.join(' ')} failed with code ${code}`))
    })
  })
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

function cleanOutDir() {
  fs.rmSync(OUT_DIR, { recursive: true, force: true })
  ensureDir(OUT_DIR)
}

function shouldCopy(fileName) {
  return !fileName.endsWith('.ts') && !fileName.endsWith('.d.ts')
}

function copyAssetsRecursive(fromDir, toDir) {
  ensureDir(toDir)
  const entries = fs.readdirSync(fromDir, { withFileTypes: true })

  for (const entry of entries) {
    const fromPath = path.join(fromDir, entry.name)
    const toPath = path.join(toDir, entry.name)
    if (entry.isDirectory()) {
      copyAssetsRecursive(fromPath, toPath)
      continue
    }
    if (entry.isFile() && shouldCopy(entry.name)) {
      fs.copyFileSync(fromPath, toPath)
    }
  }
}

let rebuilding = false
let rebuildQueued = false

async function buildOnce() {
  if (rebuilding) {
    rebuildQueued = true
    return
  }

  rebuilding = true
  try {
    cleanOutDir()
    await run('npx', ['tsc', '-p', 'tsconfig.build.json'])
    copyAssetsRecursive(SRC_DIR, OUT_DIR)
    console.log('[build] complete')
  } catch (error) {
    console.error('[build] failed:', error.message)
  } finally {
    rebuilding = false
    if (rebuildQueued) {
      rebuildQueued = false
      await buildOnce()
    }
  }
}

function watch() {
  console.log('[build] watch mode enabled')
  buildOnce()
  fs.watch(SRC_DIR, { recursive: true }, () => {
    buildOnce()
  })
}

if (WATCH_MODE) {
  watch()
} else {
  buildOnce()
}
