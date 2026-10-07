import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'

const REVEAL_MS = 250
const COVER = '#0b0f19'
const GRID_LINE = 'rgba(255, 255, 255, 0.14)'

// Cell boundaries are derived from the shared edge between neighbours so
// rounding can never leave a hairline gap between two revealed cells.
function edge(index, total, extent) {
  return Math.round((index * extent) / total)
}

export const GridCanvas = forwardRef(function GridCanvas(
  { layer, cols, rows, revealed, onToggleCell },
  ref,
) {
  const canvasRef = useRef(null)

  // Runs before the draw effect below, so the canvas is already sized correctly.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !layer) return
    canvas.width = layer.width
    canvas.height = layer.height
  }, [layer])

  // Pass now === null to force every cell to its finished state (used by export).
  const draw = useCallback(
    (now) => {
      const canvas = canvasRef.current
      if (!canvas) return false
      const ctx = canvas.getContext('2d')
      const { width, height } = canvas

      ctx.globalAlpha = 1
      ctx.imageSmoothingEnabled = true
      ctx.fillStyle = COVER
      ctx.fillRect(0, 0, width, height)

      let animating = false

      if (layer) {
        for (const [index, revealedAt] of revealed) {
          const col = index % cols
          const row = Math.floor(index / cols)
          if (row >= rows) continue

          const x = edge(col, cols, width)
          const y = edge(row, rows, height)
          const w = edge(col + 1, cols, width) - x
          const h = edge(row + 1, rows, height) - y

          const t = now === null ? 1 : Math.min(1, Math.max(0, (now - revealedAt) / REVEAL_MS))
          if (t < 1) animating = true

          const eased = 1 - (1 - t) ** 3
          const scale = 0.85 + 0.15 * eased

          ctx.save()
          ctx.globalAlpha = eased
          // At rest the blit is exactly 1:1, so disabling smoothing keeps the
          // pixel blocks hard-edged; mid-animation we want the scale smoothed.
          ctx.imageSmoothingEnabled = t < 1
          ctx.drawImage(
            layer,
            x, y, w, h,
            x + (w * (1 - scale)) / 2,
            y + (h * (1 - scale)) / 2,
            w * scale,
            h * scale,
          )
          ctx.restore()
        }
      }

      ctx.globalAlpha = 1
      ctx.strokeStyle = GRID_LINE
      ctx.lineWidth = Math.max(1, Math.round(Math.min(width, height) / 400))
      ctx.beginPath()
      for (let c = 1; c < cols; c++) {
        const x = edge(c, cols, width)
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
      }
      for (let r = 1; r < rows; r++) {
        const y = edge(r, rows, height)
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
      }
      ctx.stroke()

      return animating
    },
    [layer, cols, rows, revealed],
  )

  // Only spins while something is mid-reveal; settles back to zero rAF at rest.
  useEffect(() => {
    let raf = 0
    const tick = () => {
      raf = draw(performance.now()) ? requestAnimationFrame(tick) : 0
    }
    tick()
    return () => {
      if (raf) cancelAnimationFrame(raf)
    }
  }, [draw])

  useImperativeHandle(
    ref,
    () => ({
      get canvas() {
        return canvasRef.current
      },
      drawFinal: () => draw(null),
    }),
    [draw],
  )

  const handleClick = useCallback(
    (event) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const col = Math.floor(((event.clientX - rect.left) / rect.width) * cols)
      const row = Math.floor(((event.clientY - rect.top) / rect.height) * rows)
      if (col < 0 || col >= cols || row < 0 || row >= rows) return
      onToggleCell(row * cols + col)
    },
    [cols, rows, onToggleCell],
  )

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      className="max-h-[calc(100vh-16rem)] max-w-full cursor-pointer rounded-lg border border-border shadow-sm"
    />
  )
})
