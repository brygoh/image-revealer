import { useMemo } from 'react'

// Cap the canvas resolution so exports stay crisp without making per-frame
// draws expensive on very large uploads.
const MAX_EDGE = 2000

export function canvasSizeFor(img) {
  const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight))
  return {
    width: Math.max(1, Math.round(img.naturalWidth * scale)),
    height: Math.max(1, Math.round(img.naturalHeight * scale)),
  }
}

/**
 * Builds a full-size offscreen canvas holding the (optionally pixelated) image.
 *
 * The expensive downscale/upscale happens once per [img, pixelSize] pair rather
 * than once per cell, and callers blit 1:1 rects out of the result. Because the
 * pixel blocks are baked into one full-size layer, they stay continuous across
 * neighbouring revealed cells instead of restarting at each cell edge.
 */
export function usePixelated(img, pixelSize) {
  return useMemo(() => {
    if (!img) return null

    const { width, height } = canvasSizeFor(img)
    const layer = document.createElement('canvas')
    layer.width = width
    layer.height = height
    const ctx = layer.getContext('2d')

    if (pixelSize <= 1) {
      ctx.drawImage(img, 0, 0, width, height)
      return layer
    }

    const pw = Math.max(1, Math.round(width / pixelSize))
    const ph = Math.max(1, Math.round(height / pixelSize))
    const small = document.createElement('canvas')
    small.width = pw
    small.height = ph
    small.getContext('2d').drawImage(img, 0, 0, pw, ph)

    ctx.imageSmoothingEnabled = false
    ctx.drawImage(small, 0, 0, pw, ph, 0, 0, width, height)
    return layer
  }, [img, pixelSize])
}
