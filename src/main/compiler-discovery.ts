/**
 * Tarqeem Compiler Discovery Module
 *
 * Discovers the Tarqeem compiler installation in order of priority:
 * 1. User-configured path (from settings)
 * 2. TARQEEM_HOME environment variable
 * 3. Standard installation paths for each platform
 * 4. System PATH (fallback)
 */

import { existsSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'
import { homedir } from 'os'

export interface CompilerInfo {
  path: string
  version: string | null
}

const STANDARD_PATHS: Record<string, string[]> = {
  darwin: [
    join(homedir(), '.tarqeem/bin/tarqeem'),
    '/usr/local/bin/tarqeem',
    '/opt/homebrew/bin/tarqeem',
    '/usr/bin/tarqeem'
  ],
  linux: [
    join(homedir(), '.tarqeem/bin/tarqeem'),
    '/usr/local/bin/tarqeem',
    '/usr/bin/tarqeem',
    '/opt/tarqeem/bin/tarqeem'
  ],
  win32: [
    join(process.env.LOCALAPPDATA || '', 'Tarqeem', 'bin', 'tarqeem.exe'),
    'C:\\Program Files\\Tarqeem\\bin\\tarqeem.exe',
    'C:\\Tarqeem\\bin\\tarqeem.exe'
  ]
}

/**
 * Get the compiler executable name for the current platform
 */
function getCompilerExecutable(): string {
  return process.platform === 'win32' ? 'tarqeem.exe' : 'tarqeem'
}

/**
 * Try to get the compiler version by running --version
 */
function getVersion(compilerPath: string): string | null {
  try {
    const result = execSync(`"${compilerPath}" --version`, {
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    })
    return result.trim()
  } catch {
    return null
  }
}

/**
 * Validate that a path points to a working Tarqeem compiler
 */
function validateCompiler(path: string): boolean {
  if (!existsSync(path)) {
    return false
  }

  try {
    // Try to run --version to confirm it's a working compiler
    execSync(`"${path}" --version`, {
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    })
    return true
  } catch {
    return false
  }
}

/**
 * Discover the Tarqeem compiler location
 *
 * @param userConfigPath - Optional user-configured path from settings
 * @returns CompilerInfo if found, null otherwise
 */
export function discoverCompiler(userConfigPath?: string): CompilerInfo | null {
  // 1. User-configured path (highest priority)
  if (userConfigPath && userConfigPath.trim() !== '') {
    if (validateCompiler(userConfigPath)) {
      return { path: userConfigPath, version: getVersion(userConfigPath) }
    }
  }

  // 2. TARQEEM_HOME environment variable
  const tarqeemHome = process.env.TARQEEM_HOME
  if (tarqeemHome) {
    const binPath = join(tarqeemHome, 'bin', getCompilerExecutable())
    if (validateCompiler(binPath)) {
      return { path: binPath, version: getVersion(binPath) }
    }
  }

  // 3. Standard installation paths for this platform
  const platformPaths = STANDARD_PATHS[process.platform] || []
  for (const p of platformPaths) {
    if (validateCompiler(p)) {
      return { path: p, version: getVersion(p) }
    }
  }

  // 4. System PATH (fallback)
  try {
    const whichCommand = process.platform === 'win32' ? 'where tarqeem' : 'which tarqeem'
    const result = execSync(whichCommand, { encoding: 'utf8', timeout: 5000 })
    const pathFromWhich = result.trim().split('\n')[0]

    if (pathFromWhich && validateCompiler(pathFromWhich)) {
      return { path: pathFromWhich, version: getVersion(pathFromWhich) }
    }
  } catch {
    // Not found in PATH, that's okay
  }

  return null
}

/**
 * Get installation instructions for the current platform
 */
export function getInstallInstructions(): string {
  const platform = process.platform

  if (platform === 'darwin' || platform === 'linux') {
    return `To install Tarqeem:

1. Clone or download the Tarqeem repository
2. Run the install script:

   cd tarqeem
   ./install.sh

3. Add to your shell profile (~/.bashrc, ~/.zshrc):

   export TARQEEM_HOME="$HOME/.tarqeem"
   export PATH="$TARQEEM_HOME/bin:$PATH"

4. Restart your terminal or run: source ~/.bashrc`
  }

  if (platform === 'win32') {
    return `To install Tarqeem:

1. Clone or download the Tarqeem repository
2. Open PowerShell and run:

   cd tarqeem
   .\\install.ps1

3. Restart your terminal

The installer will automatically set TARQEEM_HOME and update your PATH.`
  }

  return 'Please visit https://github.com/osama1998H/tarqeem for installation instructions.'
}

// Cache the discovered compiler path for performance
let cachedCompiler: CompilerInfo | null | undefined = undefined

/**
 * Get the cached compiler path, or discover it if not cached
 */
export function getCachedCompiler(userConfigPath?: string): CompilerInfo | null {
  if (cachedCompiler === undefined) {
    cachedCompiler = discoverCompiler(userConfigPath)
  }
  return cachedCompiler
}

/**
 * Clear the compiler cache (call when settings change)
 */
export function clearCompilerCache(): void {
  cachedCompiler = undefined
}

/**
 * Get the compiler path, throwing an error if not found
 */
export function getCompilerPathOrThrow(userConfigPath?: string): string {
  const compiler = getCachedCompiler(userConfigPath)
  if (!compiler) {
    throw new Error(
      'Tarqeem compiler not found.\n\n' +
        getInstallInstructions() +
        '\n\nAlternatively, configure the compiler path in Settings.'
    )
  }
  return compiler.path
}
