import { readFile, writeFile, readdir, stat } from 'fs/promises'
import { join, relative, dirname } from 'path'

interface RefactoringResult {
  success: boolean
  updatedFiles: string[]
  errors?: string[]
}

/**
 * Find all .ترقيم files in a directory recursively
 */
async function findTarqeemFiles(dir: string): Promise<string[]> {
  const files: string[] = []

  async function scan(currentDir: string) {
    const entries = await readdir(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name)

      if (entry.isDirectory()) {
        // Skip node_modules, .git, and other common directories
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'out' && entry.name !== 'dist') {
          await scan(fullPath)
        }
      } else if (entry.name.endsWith('.ترقيم')) {
        files.push(fullPath)
      }
    }
  }

  await scan(dir)
  return files
}

/**
 * Calculate the relative path from one file to another
 */
function calculateRelativePath(fromFile: string, toFile: string): string {
  const fromDir = dirname(fromFile)
  let relativePath = relative(fromDir, toFile)

  // Remove extension for import paths
  if (relativePath.endsWith('.ترقيم')) {
    relativePath = relativePath.slice(0, -6)
  }

  // Ensure path starts with ./ or ../
  if (!relativePath.startsWith('.') && !relativePath.startsWith('/')) {
    relativePath = './' + relativePath
  }

  return relativePath
}

/**
 * Update import paths in all project files when a file is moved
 *
 * @param projectRoot The root directory of the project
 * @param oldPath The original path of the moved file
 * @param newPath The new path of the moved file
 */
export async function updateImportPaths(
  projectRoot: string,
  oldPath: string,
  newPath: string
): Promise<RefactoringResult> {
  const updatedFiles: string[] = []
  const errors: string[] = []

  try {
    // Find all Tarqeem files in the project
    const tarqeemFiles = await findTarqeemFiles(projectRoot)

    // Calculate the old and new relative paths from project root
    const oldRelative = relative(projectRoot, oldPath)
    const newRelative = relative(projectRoot, newPath)

    // Remove extensions for matching
    const oldWithoutExt = oldRelative.replace(/\.(ترقيم|trq)$/, '')
    const newWithoutExt = newRelative.replace(/\.(ترقيم|trq)$/, '')

    // Arabic import pattern: استورد { ... } من "path"
    // Also handle: استورد اسم من "path"
    const importRegex = /استورد\s+(?:\{[^}]+\}|[\u0600-\u06FF_]+)\s+من\s+["']([^"']+)["']/g

    for (const file of tarqeemFiles) {
      // Skip the file being moved itself
      if (file === oldPath || file === newPath) continue

      try {
        const content = await readFile(file, 'utf-8')
        let modified = false

        // Calculate what the old import path would look like from this file
        const oldImportPath = calculateRelativePath(file, oldPath)
        const newImportPath = calculateRelativePath(file, newPath)

        // Replace imports that match the old path
        const newContent = content.replace(importRegex, (match, importPath) => {
          // Normalize the import path for comparison
          let normalizedImportPath = importPath
          if (!normalizedImportPath.startsWith('.') && !normalizedImportPath.startsWith('/')) {
            normalizedImportPath = './' + normalizedImportPath
          }

          // Check if this import matches the moved file
          const cleanOldPath = oldImportPath.replace(/^\.\//, '')
          const cleanImportPath = normalizedImportPath.replace(/^\.\//, '')

          if (cleanImportPath === cleanOldPath ||
              cleanImportPath === cleanOldPath.replace(/\.(ترقيم|trq)$/, '')) {
            modified = true
            return match.replace(importPath, newImportPath)
          }

          return match
        })

        if (modified) {
          await writeFile(file, newContent, 'utf-8')
          updatedFiles.push(file)
        }
      } catch (err) {
        errors.push(`Failed to process ${file}: ${err}`)
      }
    }

    return { success: true, updatedFiles, errors: errors.length > 0 ? errors : undefined }
  } catch (err) {
    return { success: false, updatedFiles, errors: [`Refactoring failed: ${err}`] }
  }
}
