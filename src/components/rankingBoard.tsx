'use client';

import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useMutation, useQuery } from "convex/react";
import { Loader, Plus, Trash2, GripVertical, ImagePlus, Type, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RankingMode = "image" | "text";

type RankingRow = {
  id: string;
  label: string;
  color: string;
};

type RankingItem = {
  _id: Id<"rankingItems">;
  rowId: string;
  type: RankingMode;
  text?: string;
  url?: string | null;
  order: number;
};

type RankingData = {
  ranking: {
    mode: RankingMode;
    rows: RankingRow[];
  };
  items: RankingItem[];
};

const rowColors = ["#dc2626", "#ea580c", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#6b7280", "#ec4899"];
const EMPTY_ROWS: RankingRow[] = [];
const EMPTY_ITEMS: RankingItem[] = [];
const BANK_ROW_ID = "__bank__";

const makeId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const fileToImage = (file: File) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    image.src = url;
  });

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not compress image"));
    }, type, quality);
  });

async function compressImage(file: File) {
  if (!file.type.startsWith("image/")) return file;

  const image = await fileToImage(file);
  const maxSide = 1280;
  const ratio = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * ratio));
  const height = Math.max(1, Math.round(image.naturalHeight * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return file;

  ctx.drawImage(image, 0, 0, width, height);

  const mime = "image/webp";
  const blob = await canvasToBlob(canvas, mime, 0.74);
  const fallbackBlob = blob.size < file.size ? blob : file;

  if (fallbackBlob === file) return file;
  return new File([fallbackBlob], file.name.replace(/\.[^.]+$/, ".webp"), { type: mime });
}

interface RankingBoardProps {
  boardId: Id<"boards">;
}

export const RankingBoard = ({ boardId }: RankingBoardProps) => {
  const data = useQuery(api.rankings.get, { boardId }) as RankingData | undefined;
  const setMode = useMutation(api.rankings.setMode);
  const updateRows = useMutation(api.rankings.updateRows);
  const createTextItem = useMutation(api.rankings.createTextItem);
  const generateUploadUrl = useMutation(api.rankings.generateUploadUrl);
  const createImageItem = useMutation(api.rankings.createImageItem);
  const moveItem = useMutation(api.rankings.moveItem);
  const updateItemText = useMutation(api.rankings.updateItemText);
  const deleteItem = useMutation(api.rankings.deleteItem);

  const [textDrafts, setTextDrafts] = useState<Record<string, string>>({});
  const [draggedItemId, setDraggedItemId] = useState<Id<"rankingItems"> | null>(null);
  const draggedItemIdRef = useRef<Id<"rankingItems"> | null>(null);
  const [dropTarget, setDropTarget] = useState<{ rowId: string; beforeId?: Id<"rankingItems"> } | null>(null);
  const [uploadingRowId, setUploadingRowId] = useState<string | null>(null);
  const [newRowLabel, setNewRowLabel] = useState("");

  const rows = data?.ranking.rows ?? EMPTY_ROWS;
  const items = data?.items ?? EMPTY_ITEMS;
  const mode = data?.ranking.mode || "image";

  const itemsByRow = useMemo(() => {
    const map = new Map<string, RankingItem[]>();
    map.set(BANK_ROW_ID, []);
    rows.forEach((row) => map.set(row.id, []));
    items.forEach((item) => {
      const bucket = map.get(item.rowId) ?? map.get(BANK_ROW_ID);
      if (bucket) bucket.push(item);
    });
    map.forEach((bucket) => bucket.sort((a, b) => a.order - b.order));
    return map;
  }, [items, rows]);

  const persistRows = async (nextRows: RankingRow[]) => {
    try {
      await updateRows({ boardId, rows: nextRows });
    } catch (error) {
      console.error(error);
      toast.error("Failed to update rows");
    }
  };

  const handleModeChange = async (nextMode: RankingMode) => {
    try {
      await setMode({ boardId, mode: nextMode });
    } catch {
      toast.error("Failed to change ranking mode");
    }
  };

  const addRow = async () => {
    const label = newRowLabel.trim();
    if (!label) return;
    const nextRows = [
      ...rows,
      {
        id: makeId(),
        label,
        color: rowColors[rows.length % rowColors.length],
      },
    ];
    setNewRowLabel("");
    await persistRows(nextRows);
  };

  const renameRow = async (rowId: string, label: string) => {
    const nextRows = rows.map((row) => row.id === rowId ? { ...row, label } : row);
    await persistRows(nextRows);
  };

  const removeRow = async (rowId: string) => {
    const rowItems = itemsByRow.get(rowId) ?? EMPTY_ITEMS;
    if (rowItems.length > 0) {
      toast.error("Move or delete the row items first");
      return;
    }
    if (rows.length <= 1) {
      toast.error("Keep at least one ranking row");
      return;
    }
    await persistRows(rows.filter((row) => row.id !== rowId));
  };

  const addText = async (rowId: string) => {
    const text = (textDrafts[rowId] || "").trim();
    if (!text) return;

    try {
      await createTextItem({ boardId, rowId, text });
      setTextDrafts((drafts) => ({ ...drafts, [rowId]: "" }));
    } catch {
      toast.error("Failed to add item");
    }
  };

  const addImages = async (rowId: string, event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length === 0) return;

    try {
      setUploadingRowId(rowId);
      for (const file of files) {
        const compressed = await compressImage(file);
        const uploadUrl = await generateUploadUrl({ boardId });
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": compressed.type || "application/octet-stream" },
          body: compressed,
        });

        if (!result.ok) {
          throw new Error("Upload failed");
        }

        const { storageId } = await result.json();
        await createImageItem({
          boardId,
          rowId,
          storageId,
          text: file.name.replace(/\.[^.]+$/, ""),
        });
      }
      toast.success(files.length === 1 ? "Image added" : "Images added");
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload image");
    } finally {
      setUploadingRowId(null);
    }
  };

  const orderedIdsForDrop = (rowId: string, itemId: Id<"rankingItems">, beforeId?: Id<"rankingItems">) => {
    const rowItems = (itemsByRow.get(rowId) ?? EMPTY_ITEMS).filter((item) => item._id !== itemId);
    const ids = rowItems.map((item) => item._id);
    if (!beforeId) return [...ids, itemId];

    const index = ids.indexOf(beforeId);
    if (index === -1) return [...ids, itemId];

    const next = [...ids];
    next.splice(index, 0, itemId);
    return next;
  };

  const handleDrop = async (rowId: string, beforeId?: Id<"rankingItems">) => {
    const itemId = draggedItemIdRef.current ?? draggedItemId;
    if (!itemId) return;
    const orderedIds = orderedIdsForDrop(rowId, itemId, beforeId);
    setDropTarget(null);

    try {
      await moveItem({ itemId, rowId, orderedIds });
    } catch (error) {
      console.error(error);
      toast.error("Failed to move item");
    } finally {
      draggedItemIdRef.current = null;
      setDraggedItemId(null);
    }
  };

  const renderRankingItem = (item: RankingItem, rowId: string) => (
    <div
      key={item._id}
      draggable
      onDragStart={(event: DragEvent<HTMLDivElement>) => {
        draggedItemIdRef.current = item._id;
        setDraggedItemId(item._id);
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", item._id);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setDropTarget({ rowId, beforeId: item._id });
      }}
      onDrop={(event) => {
        event.stopPropagation();
        handleDrop(rowId, item._id);
      }}
      className={cn(
        "group relative flex min-h-[84px] w-[132px] cursor-grab flex-col overflow-hidden rounded border border-[#3a3a3a] bg-[#151515] shadow-sm active:cursor-grabbing",
        dropTarget?.beforeId === item._id && "ring-2 ring-green-500"
      )}
    >
      <div className="absolute left-1 top-1 z-10 rounded bg-black/50 p-1 text-gray-300 opacity-0 transition group-hover:opacity-100">
        <GripVertical className="h-3.5 w-3.5" />
      </div>
      <button
        type="button"
        onClick={() => deleteItem({ itemId: item._id })}
        className="absolute right-1 top-1 z-10 rounded bg-black/60 p-1 text-red-300 opacity-0 transition hover:text-red-200 group-hover:opacity-100"
        aria-label="Delete ranking item"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {item.type === "image" && item.url ? (
        <div className="relative h-[96px] w-full bg-[#101010]">
          <Image
            src={item.url}
            alt={item.text || "Ranking item"}
            fill
            sizes="132px"
            className="object-cover"
            priority={rowId === rows[0]?.id}
          />
        </div>
      ) : (
        <textarea
          id={`ranking-item-text-${item._id}`}
          name={`rankingItemText-${item._id}`}
          value={item.text || ""}
          onChange={(event) => updateItemText({ itemId: item._id, text: event.target.value })}
          className="min-h-[84px] resize-none bg-transparent p-3 text-center text-sm text-gray-100 outline-none"
          aria-label="Ranking text item"
        />
      )}

      {item.type === "image" && (
        <input
          id={`ranking-item-caption-${item._id}`}
          name={`rankingItemCaption-${item._id}`}
          value={item.text || ""}
          onChange={(event) => updateItemText({ itemId: item._id, text: event.target.value })}
          className="border-t border-[#2f2f2f] bg-[#181818] px-2 py-1 text-xs text-gray-200 outline-none"
          placeholder="Caption"
        />
      )}
    </div>
  );

  const renderTextAdder = (rowId: string) => (
    <div className="flex max-w-lg flex-col gap-2 sm:flex-row">
      <input
        id={`ranking-text-draft-${rowId}`}
        name={`rankingTextDraft-${rowId}`}
        value={textDrafts[rowId] || ""}
        onChange={(event) => setTextDrafts((drafts) => ({ ...drafts, [rowId]: event.target.value }))}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            addText(rowId);
          }
        }}
        placeholder="Add text item"
        className="h-9 flex-1 rounded-md border border-[#333333] bg-[#111111] px-3 text-sm text-gray-200 outline-none focus:border-[#555555]"
      />
      <Button
        type="button"
        onClick={() => addText(rowId)}
        className="h-9 bg-[#303030] text-gray-200 hover:bg-[#3d3d3d]"
      >
        <Plus className="mr-2 h-4 w-4" />
        Add
      </Button>
    </div>
  );

  const renderImageAdder = (rowId: string) => (
    <label
      htmlFor={`ranking-image-upload-${rowId}`}
      className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-[#3a3a3a] bg-[#151515] px-3 text-sm text-gray-300 transition hover:bg-[#252525]"
    >
      {uploadingRowId === rowId ? <Loader className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
      Add image
      <input
        id={`ranking-image-upload-${rowId}`}
        name={`rankingImageUpload-${rowId}`}
        type="file"
        accept="image/*"
        multiple
        disabled={uploadingRowId !== null}
        onChange={(event) => addImages(rowId, event)}
        className="sr-only"
      />
    </label>
  );

  if (!data) {
    return (
      <div className="flex h-full items-center justify-center bg-[#1a1a1a]">
        <Loader className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-[#1a1a1a] p-3 text-gray-200 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 border-b border-[#333333] pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 rounded-md border border-[#333333] bg-[#222222] p-1 w-fit">
          <button
            type="button"
            onClick={() => handleModeChange("image")}
            className={cn(
              "inline-flex items-center gap-2 rounded px-3 py-2 text-sm transition",
              mode === "image" ? "bg-[#3a3a3a] text-white" : "text-gray-400 hover:bg-[#2f2f2f]"
            )}
          >
            <ImagePlus className="h-4 w-4" />
            Images
          </button>
          <button
            type="button"
            onClick={() => handleModeChange("text")}
            className={cn(
              "inline-flex items-center gap-2 rounded px-3 py-2 text-sm transition",
              mode === "text" ? "bg-[#3a3a3a] text-white" : "text-gray-400 hover:bg-[#2f2f2f]"
            )}
          >
            <Type className="h-4 w-4" />
            Text
          </button>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <input
            id={`ranking-new-row-${boardId}`}
            name="rankingNewRow"
            value={newRowLabel}
            onChange={(event) => setNewRowLabel(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addRow();
              }
            }}
            placeholder="Add row label"
            className="h-9 rounded-md border border-[#333333] bg-[#111111] px-3 text-sm text-gray-200 outline-none focus:border-[#555555]"
          />
          <Button
            type="button"
            onClick={addRow}
            className="h-9 bg-[#303030] text-gray-200 hover:bg-[#3d3d3d]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Row
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((row) => {
          const rowItems = itemsByRow.get(row.id) ?? EMPTY_ITEMS;
          const isRowDropTarget = dropTarget?.rowId === row.id && !dropTarget.beforeId;

          return (
            <div
              key={row.id}
              className={cn(
                "grid min-h-[120px] grid-cols-1 overflow-hidden rounded-md border border-[#333333] bg-[#202020] sm:grid-cols-[112px_minmax(0,1fr)]",
                isRowDropTarget && "ring-2 ring-green-500"
              )}
              onDragOver={(event) => {
                event.preventDefault();
                setDropTarget({ rowId: row.id });
              }}
              onDrop={() => handleDrop(row.id)}
            >
              <div
                className="flex min-h-[72px] items-center justify-between gap-2 border-b border-[#333333] p-3 sm:min-h-full sm:flex-col sm:justify-center sm:border-b-0 sm:border-r"
                style={{ backgroundColor: row.color }}
              >
                <input
                  id={`ranking-row-${row.id}`}
                  name={`rankingRow-${row.id}`}
                  value={row.label}
                  onChange={(event) => renameRow(row.id, event.target.value)}
                  className="w-full bg-transparent text-center text-2xl font-bold text-white outline-none placeholder:text-white/60"
                  aria-label="Ranking row label"
                />
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="rounded p-1 text-white/80 hover:bg-black/20 hover:text-white"
                  aria-label="Delete ranking row"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex min-h-[120px] flex-col gap-3 p-3">
                <div className="flex flex-wrap gap-3">
                  {rowItems.map((item) => renderRankingItem(item, row.id))}
                </div>

                <div className="mt-auto">
                  {mode === "image" ? (
                    renderImageAdder(row.id)
                  ) : (
                    renderTextAdder(row.id)
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {(() => {
        const bankItems = itemsByRow.get(BANK_ROW_ID) ?? EMPTY_ITEMS;
        const isBankDropTarget = dropTarget?.rowId === BANK_ROW_ID && !dropTarget.beforeId;

        return (
          <section className="mt-5 overflow-hidden rounded-md border border-dashed border-[#4a4a4a] bg-[#171717]">
            <div className="flex flex-col gap-1 border-b border-[#2f2f2f] bg-[#202020] px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-200">Item bank</h3>
                <p className="text-xs text-gray-500">Add images or text here, then drag them into a ranking row or back to the bank.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                {renderTextAdder(BANK_ROW_ID)}
                {renderImageAdder(BANK_ROW_ID)}
              </div>
            </div>

            <div
              className={cn(
                "min-h-[148px] p-3 transition",
                isBankDropTarget && "bg-green-500/10 ring-2 ring-inset ring-green-500"
              )}
              onDragOver={(event) => {
                event.preventDefault();
                setDropTarget({ rowId: BANK_ROW_ID });
              }}
              onDrop={() => handleDrop(BANK_ROW_ID)}
            >
              {bankItems.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {bankItems.map((item) => renderRankingItem(item, BANK_ROW_ID))}
                </div>
              ) : (
                <div className="flex min-h-[116px] items-center justify-center rounded border border-[#2a2a2a] bg-[#111111] text-sm text-gray-500">
                  Drop unranked items here
                </div>
              )}
            </div>
          </section>
        );
      })()}
    </div>
  );
};
