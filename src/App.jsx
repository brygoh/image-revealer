import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Controls } from "@/Controls";
import { GridCanvas } from "@/GridCanvas";
import { ImageStrip } from "@/ImageStrip";
import { usePixelated } from "@/usePixelated";
import { TooltipProvider } from "@/components/ui/tooltip";

const EMPTY_REVEALED = new Map();

export default function App() {
  const [images, setImages] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [cols, setCols] = useState(4);
  const [rows, setRows] = useState(4);
  const [pixelSize, setPixelSize] = useState(10);
  // { [imageId]: Map<cellIndex, revealedAt> } — the timestamp drives the animation.
  const [revealedById, setRevealedById] = useState({});

  const canvasApi = useRef(null);

  const current = useMemo(
    () => images.find((i) => i.id === currentId) ?? null,
    [images, currentId],
  );
  const revealed = revealedById[currentId] ?? EMPTY_REVEALED;
  const layer = usePixelated(current?.img, pixelSize);
  const hiddenCount = cols * rows - revealed.size;

  // Revoke every outstanding object URL when the app unmounts.
  const imagesRef = useRef(images);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);
  useEffect(
    () => () => {
      for (const image of imagesRef.current) URL.revokeObjectURL(image.url);
    },
    [],
  );

  const handleFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList ?? []).filter((file) =>
      file.type.startsWith("image/"),
    );
    const loaded = [];

    for (const file of files) {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.src = url;
      try {
        // Wait for decode so the canvas never draws a half-loaded image.
        await img.decode();
      } catch {
        URL.revokeObjectURL(url);
        continue;
      }
      loaded.push({ id: crypto.randomUUID(), name: file.name, url, img });
    }

    if (loaded.length === 0) return;
    setImages((prev) => [...prev, ...loaded]);
    setCurrentId((prev) => prev ?? loaded[0].id);
  }, []);

  const updateRevealed = useCallback(
    (mutate) => {
      if (!currentId) return;
      setRevealedById((prev) => {
        const next = new Map(prev[currentId] ?? EMPTY_REVEALED);
        if (mutate(next) === false) return prev;
        return { ...prev, [currentId]: next };
      });
    },
    [currentId],
  );

  const toggleCell = useCallback(
    (index) => {
      updateRevealed((map) => {
        if (map.has(index)) map.delete(index);
        else map.set(index, performance.now());
      });
    },
    [updateRevealed],
  );

  const revealRandom = useCallback(() => {
    updateRevealed((map) => {
      const hidden = [];
      for (let i = 0; i < cols * rows; i++) if (!map.has(i)) hidden.push(i);
      if (hidden.length === 0) return false;
      map.set(
        hidden[Math.floor(Math.random() * hidden.length)],
        performance.now(),
      );
    });
  }, [updateRevealed, cols, rows]);

  const revealAll = useCallback(() => {
    updateRevealed((map) => {
      const now = performance.now();
      for (let i = 0; i < cols * rows; i++) if (!map.has(i)) map.set(i, now);
    });
  }, [updateRevealed, cols, rows]);

  const reset = useCallback(
    () => updateRevealed((map) => map.clear()),
    [updateRevealed],
  );

  // Cell indices are tied to the grid dimensions, so a resize invalidates them.
  const changeGrid = useCallback((nextCols, nextRows) => {
    setCols(nextCols);
    setRows(nextRows);
    setRevealedById({});
  }, []);

  const removeImage = useCallback(
    (id) => {
      const target = images.find((image) => image.id === id);
      if (target) URL.revokeObjectURL(target.url);
      const next = images.filter((image) => image.id !== id);
      setImages(next);
      if (currentId === id) setCurrentId(next[0]?.id ?? null);
      setRevealedById((prev) => {
        const rest = { ...prev };
        delete rest[id];
        return rest;
      });
    },
    [images, currentId],
  );

  const download = useCallback(() => {
    const api = canvasApi.current;
    if (!api?.canvas) return;
    // Force every cell to full opacity first, otherwise an export fired
    // mid-animation would capture a half-faded cell.
    api.drawFinal();
    api.canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${(current?.name ?? "image").replace(/\.[^.]+$/, "")}-reveal.png`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  }, [current]);

  useEffect(() => {
    const onKeyDown = (event) => {
      // Let focused controls handle their own keys (a focused button already
      // reveals on Space, and typing a grid size must not fire shortcuts).
      if (
        event.target?.closest?.(
          'input, textarea, button, [role="slider"], [contenteditable="true"]',
        )
      ) {
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        revealRandom();
      } else if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        reset();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [revealRandom, reset]);

  return (
    <TooltipProvider>
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 p-6">
        <header>
          <h1 className="text-xl font-semibold tracking-tight">
            Pixelated Reveal
          </h1>
          <p className="text-sm text-muted-foreground">
            Click a cell to toggle it, or press Space to reveal one at random.
            Changing the grid resets progress.
          </p>
        </header>

        <Controls
          cols={cols}
          rows={rows}
          pixelSize={pixelSize}
          hasImage={Boolean(current)}
          hiddenCount={hiddenCount}
          onFiles={handleFiles}
          onGridChange={changeGrid}
          onPixelSizeChange={setPixelSize}
          onRevealRandom={revealRandom}
          onRevealAll={revealAll}
          onReset={reset}
          onDownload={download}
        />

        <ImageStrip
          images={images}
          currentId={currentId}
          onSelect={setCurrentId}
          onRemove={removeImage}
        />

        <main className="flex flex-1 items-center justify-center">
          {current ? (
            <GridCanvas
              ref={canvasApi}
              layer={layer}
              cols={cols}
              rows={rows}
              revealed={revealed}
              onToggleCell={toggleCell}
            />
          ) : (
            <p className="rounded-lg border border-dashed px-10 py-16 text-sm text-muted-foreground">
              Upload an image to get started.
            </p>
          )}
        </main>
      </div>
    </TooltipProvider>
  );
}
