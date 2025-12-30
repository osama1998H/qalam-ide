#!/usr/bin/env node
/**
 * Icon generation script for Qalam IDE
 * Converts SVG to all required formats for electron-builder
 */

const fs = require('fs')
const path = require('path')
const { Resvg } = require('@resvg/resvg-js')
const sharp = require('sharp')
const pngToIco = require('png-to-ico').default || require('png-to-ico')

const RESOURCES_DIR = path.join(__dirname, '..', 'resources')
const ICONS_DIR = path.join(RESOURCES_DIR, 'icons')
const SVG_PATH = path.join(RESOURCES_DIR, 'icon.svg')

// Icon sizes needed for different platforms
const SIZES = [16, 32, 64, 128, 256, 512, 1024]

async function generatePNGs() {
  console.log('Reading SVG...')
  const svgContent = fs.readFileSync(SVG_PATH, 'utf-8')

  // Ensure icons directory exists
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true })
  }

  console.log('Generating PNG icons...')
  for (const size of SIZES) {
    const resvg = new Resvg(svgContent, {
      fitTo: {
        mode: 'width',
        value: size
      }
    })
    const pngData = resvg.render()
    const pngBuffer = pngData.asPng()

    const outputPath = path.join(ICONS_DIR, `${size}x${size}.png`)
    fs.writeFileSync(outputPath, pngBuffer)
    console.log(`  Created ${size}x${size}.png`)
  }

  // Copy 512x512 as main icon.png
  fs.copyFileSync(
    path.join(ICONS_DIR, '512x512.png'),
    path.join(RESOURCES_DIR, 'icon.png')
  )
  console.log('  Created icon.png (512x512)')
}

async function generateICO() {
  console.log('Generating Windows .ico...')
  const pngFiles = [16, 32, 48, 64, 128, 256].map(size => {
    const pngPath = path.join(ICONS_DIR, `${size}x${size}.png`)
    if (fs.existsSync(pngPath)) {
      return pngPath
    }
    // Fall back to closest size
    return path.join(ICONS_DIR, '256x256.png')
  })

  // Generate 48x48 if not exists
  const png48Path = path.join(ICONS_DIR, '48x48.png')
  if (!fs.existsSync(png48Path)) {
    const resvg = new Resvg(fs.readFileSync(SVG_PATH, 'utf-8'), {
      fitTo: { mode: 'width', value: 48 }
    })
    fs.writeFileSync(png48Path, resvg.render().asPng())
  }

  try {
    const icoBuffer = await pngToIco([
      path.join(ICONS_DIR, '16x16.png'),
      path.join(ICONS_DIR, '32x32.png'),
      path.join(ICONS_DIR, '48x48.png'),
      path.join(ICONS_DIR, '64x64.png'),
      path.join(ICONS_DIR, '128x128.png'),
      path.join(ICONS_DIR, '256x256.png')
    ])
    fs.writeFileSync(path.join(RESOURCES_DIR, 'icon.ico'), icoBuffer)
    console.log('  Created icon.ico')
  } catch (err) {
    console.error('Error creating .ico:', err.message)
  }
}

async function generateICNS() {
  console.log('Generating macOS .icns...')

  // Create iconset directory
  const iconsetDir = path.join(RESOURCES_DIR, 'icon.iconset')
  if (!fs.existsSync(iconsetDir)) {
    fs.mkdirSync(iconsetDir, { recursive: true })
  }

  // macOS icon sizes and their names
  const macSizes = [
    { size: 16, name: 'icon_16x16.png' },
    { size: 32, name: 'icon_16x16@2x.png' },
    { size: 32, name: 'icon_32x32.png' },
    { size: 64, name: 'icon_32x32@2x.png' },
    { size: 128, name: 'icon_128x128.png' },
    { size: 256, name: 'icon_128x128@2x.png' },
    { size: 256, name: 'icon_256x256.png' },
    { size: 512, name: 'icon_256x256@2x.png' },
    { size: 512, name: 'icon_512x512.png' },
    { size: 1024, name: 'icon_512x512@2x.png' }
  ]

  const svgContent = fs.readFileSync(SVG_PATH, 'utf-8')

  for (const { size, name } of macSizes) {
    const resvg = new Resvg(svgContent, {
      fitTo: { mode: 'width', value: size }
    })
    const pngBuffer = resvg.render().asPng()
    fs.writeFileSync(path.join(iconsetDir, name), pngBuffer)
    console.log(`  Created ${name}`)
  }

  // Use iconutil to create .icns (macOS only)
  const { execSync } = require('child_process')
  try {
    execSync(`iconutil -c icns "${iconsetDir}" -o "${path.join(RESOURCES_DIR, 'icon.icns')}"`)
    console.log('  Created icon.icns')

    // Clean up iconset directory
    fs.rmSync(iconsetDir, { recursive: true })
    console.log('  Cleaned up iconset directory')
  } catch (err) {
    console.error('Error creating .icns (iconutil may not be available):', err.message)
    console.log('  Keeping iconset directory for manual conversion')
  }
}

async function main() {
  console.log('=== Qalam IDE Icon Generator ===\n')

  if (!fs.existsSync(SVG_PATH)) {
    console.error(`SVG not found at ${SVG_PATH}`)
    process.exit(1)
  }

  try {
    await generatePNGs()
    await generateICO()
    await generateICNS()

    console.log('\n=== Icon generation complete! ===')
    console.log('\nGenerated files:')
    console.log('  resources/icon.png    - Main PNG icon')
    console.log('  resources/icon.ico    - Windows icon')
    console.log('  resources/icon.icns   - macOS icon')
    console.log('  resources/icons/      - Linux icon sizes')
  } catch (err) {
    console.error('Error generating icons:', err)
    process.exit(1)
  }
}

main()
