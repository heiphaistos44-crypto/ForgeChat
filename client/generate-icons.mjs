// Génère les icônes PWA ForgeChat avec canvas-kit ou SVG natif
// Exécuter : node generate-icons.mjs
import { createCanvas } from 'canvas'
import { writeFileSync, mkdirSync } from 'fs'

mkdirSync('./public/icons', { recursive: true })

function drawIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Fond arrondi #5865f2
  const r = size * 0.22
  ctx.beginPath()
  ctx.moveTo(r, 0)
  ctx.lineTo(size - r, 0)
  ctx.quadraticCurveTo(size, 0, size, r)
  ctx.lineTo(size, size - r)
  ctx.quadraticCurveTo(size, size, size - r, size)
  ctx.lineTo(r, size)
  ctx.quadraticCurveTo(0, size, 0, size - r)
  ctx.lineTo(0, r)
  ctx.quadraticCurveTo(0, 0, r, 0)
  ctx.closePath()
  ctx.fillStyle = '#5865f2'
  ctx.fill()

  // Lettre F blanche centrée
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${size * 0.55}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('F', size / 2, size / 2 + size * 0.04)

  return canvas.toBuffer('image/png')
}

writeFileSync('./public/icons/icon-192.png', drawIcon(192))
writeFileSync('./public/icons/icon-512.png', drawIcon(512))
console.log('Icônes générées : public/icons/icon-192.png, icon-512.png')
