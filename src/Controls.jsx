import {
  Download,
  Eye,
  Grid2x2,
  RotateCcw,
  Shuffle,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

export function Controls({
  cols,
  rows,
  pixelSize,
  hasImage,
  hiddenCount,
  onFiles,
  onGridChange,
  onPixelSizeChange,
  onRevealRandom,
  onRevealAll,
  onReset,
  onDownload,
}) {
  const clampGrid = (raw) => Math.min(24, Math.max(1, Number(raw) || 1));

  return (
    <Card>
      <CardContent className="flex flex-wrap items-end gap-5">
        <Field label="Images">
          <Button asChild variant="secondary">
            <label className="cursor-pointer">
              <Upload />
              Upload
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => {
                  onFiles(event.target.files);
                  // Reset so re-picking the same file still fires a change event.
                  event.target.value = "";
                }}
              />
            </label>
          </Button>
        </Field>

        <Field label="Grid">
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              min={1}
              max={24}
              value={cols}
              onChange={(event) =>
                onGridChange(clampGrid(event.target.value), rows)
              }
              className="w-16"
              aria-label="Columns"
            />
            <Grid2x2 className="size-3.5 shrink-0 text-muted-foreground" />
            <Input
              type="number"
              min={1}
              max={24}
              value={rows}
              onChange={(event) =>
                onGridChange(cols, clampGrid(event.target.value))
              }
              className="w-16"
              aria-label="Rows"
            />
          </div>
        </Field>

        <Field
          label={`Pixelation — ${pixelSize === 1 ? "off" : `${pixelSize}px`}`}
        >
          <div className="flex h-9 w-56 items-center">
            <Slider
              min={1}
              max={10}
              step={1}
              value={[pixelSize]}
              onValueChange={([value]) => onPixelSizeChange(value)}
              aria-label="Pixelation strength"
            />
          </div>
        </Field>

        <div className="ml-auto flex items-end gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onRevealRandom}
                disabled={!hasImage || hiddenCount === 0}
              >
                <Shuffle />
                Reveal
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {hiddenCount === 0
                ? "Every cell is revealed"
                : `Space — ${hiddenCount} left`}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                onClick={onRevealAll}
                disabled={!hasImage}
              >
                <Eye />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reveal all</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" onClick={onReset} disabled={!hasImage}>
                <RotateCcw />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset — R</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                onClick={onDownload}
                disabled={!hasImage}
              >
                <Download />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Download PNG</TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  );
}
