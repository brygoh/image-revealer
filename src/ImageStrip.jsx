import { X } from 'lucide-react'

import { cn } from '@/lib/utils'

export function ImageStrip({ images, currentId, onSelect, onRemove }) {
  if (images.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {images.map((image) => (
        <div key={image.id} className="group relative">
          <button
            type="button"
            onClick={() => onSelect(image.id)}
            title={image.name}
            className={cn(
              'block size-16 overflow-hidden rounded-md border-2 transition-colors',
              image.id === currentId
                ? 'border-primary'
                : 'border-transparent opacity-60 hover:opacity-100',
            )}
          >
            <img src={image.url} alt={image.name} className="size-full object-cover" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(image.id)}
            aria-label={`Remove ${image.name}`}
            className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full border bg-background opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          >
            <X className="size-3" />
          </button>
        </div>
      ))}
    </div>
  )
}
