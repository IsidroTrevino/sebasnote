'use client';

import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { toast } from "sonner";
import { EditorContent } from '@tiptap/react';
import { Loader, Palette, Link2, Plus, Trash2, ExternalLink, ArrowRight } from "lucide-react";
import { HierarchicalBoardPicker } from "./hierarchicalBoardPicker";
import { normalizeUrl } from '@/lib/utils';
import { HudColorPicker } from "@/components/hudColorPicker";
import { useUpdateCardModal } from "../store/useUpdateCardModal";
import { useSharedEditor, EditorStyles } from '../store/useSharedEditor';
import MenuBar from './editor/menuBar';
import { cn } from "@/lib/utils";
import { Id } from "../../../../convex/_generated/dataModel";
import { BoardType } from "@/features/types/boardType";

// Predefined colors for mind map cards
const CARD_COLORS = [
  { name: "Default", value: "#2a2a2a" },
  { name: "Red", value: "#7f1d1d" },
  { name: "Orange", value: "#7c2d12" },
  { name: "Yellow", value: "#713f12" },
  { name: "Green", value: "#14532d" },
  { name: "Teal", value: "#134e4a" },
  { name: "Blue", value: "#1e3a5f" },
  { name: "Purple", value: "#4c1d95" },
  { name: "Pink", value: "#831843" },
];

type RefItem = { id?: string; type: 'board' | 'url'; boardId?: Id<'boards'>; url?: string; name?: string; color?: string };

export const UpdateCardModal = () => {
  const { isOpen, card, onClose } = useUpdateCardModal();
  const [content, setContent] = useState("");
  const [selectedColor, setSelectedColor] = useState("#2a2a2a");
  const [linkedBoardId, setLinkedBoardId] = useState<Id<'boards'> | undefined>(undefined);
  const [linkedUrl, setLinkedUrl] = useState<string | undefined>(undefined);
  const [linkedUrlTitle, setLinkedUrlTitle] = useState<string | undefined>(undefined);
  const [linkedReferences, setLinkedReferences] = useState<RefItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryInput, setCategoryInput] = useState('');
  const [hoveredRefIdx, setHoveredRefIdx] = useState<number | null>(null);
  const removeRef = (idx: number) => {
    console.log('removeRef update called', idx);
    const removed = linkedReferences?.[idx];
    const newRefs = (linkedReferences || []).filter((_, i) => i !== idx);
    setLinkedReferences(newRefs);
    if (removed?.type === 'board') {
      setLinkedBoardId(undefined);
    }
    console.log('new linkedReferences', newRefs);
  };
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBoardPicker, setShowBoardPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const updateCard = useMutation(api.cards.update);
  const allBoards = useQuery(api.boards.listAll);

  // Get board path for tooltip
  const getBoardPath = useCallback((boardId: Id<"boards">): string => {
    if (!allBoards) return "";
    
    const board = allBoards.find((b) => b._id === boardId);
    if (!board) return "";

    const path: string[] = [board.name];
    let currentId: Id<"boards"> | undefined = board.parentId;

    while (currentId) {
      const parent = allBoards.find((b) => b._id === currentId);
      if (!parent) break;
      path.unshift(parent.name);
      currentId = parent.parentId;
    }

    return path.join(" / ");
  }, [allBoards]);
  
  // Use the shared editor hook with card-specific options
  const editor = useSharedEditor({
    initialContent: '',
    placeholder: 'Start typing...',
    onUpdate: (newContent) => {
      setContent(newContent);
    },
    enableResizableImage: true,
    enableNavigation: true
  });
  
  // Set initial content and properties when card changes
  useEffect(() => {
    if (!card) return;
    type CardLike = {
      content?: string;
      color?: string;
      linkedBoardId?: Id<'boards'>;
      linkedUrl?: string;
      categories?: string[];
      linkedReferences?: Array<{ type?: string; boardId?: string; url?: string; name?: string; color?: string }>;
    };
    const c = card as unknown as CardLike;
    if (editor && c.content) {
      editor.commands.setContent(c.content as string);
      setContent(c.content as string);
    }
    setSelectedColor(c.color || "#2a2a2a");
    setLinkedBoardId(c.linkedBoardId as Id<'boards'> | undefined);
    setLinkedUrl(c.linkedUrl ?? undefined);
    setCategories(Array.isArray(c.categories) ? c.categories : []);
    if (Array.isArray(c.linkedReferences)) {
      setLinkedReferences(c.linkedReferences.map(r => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        type: (r.type === 'board' ? 'board' : 'url'),
        boardId: r.boardId as Id<'boards'> | undefined,
        url: r.url as unknown as string | undefined,
        name: r.name as unknown as string | undefined,
        color: r.color as unknown as string | undefined,
      })));
    } else {
      setLinkedReferences([]);
    }
  }, [editor, card]);
  
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const boardToggleRef = useRef<HTMLButtonElement | null>(null);
  const colorToggleRef = useRef<HTMLButtonElement | null>(null);
  const suppressCloseRef = useRef(false);

  const handleClose = useCallback(() => {
    onClose();
    if (editor) {
      editor.commands.clearContent();
    }
    setContent("");
    setSelectedColor("#2a2a2a");
    setLinkedBoardId(undefined);
    setLinkedUrl(undefined);
    setLinkedReferences([]);
    setShowColorPicker(false);
    setShowBoardPicker(false);
  }, [onClose, editor]);

  const getComposedPath = (ev: Event): EventTarget[] | null => {
    const maybe = ev as unknown as { composedPath?: () => EventTarget[] };
    return typeof maybe.composedPath === 'function' ? maybe.composedPath() : null;
  };

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (suppressCloseRef.current) return;
      if (!(e.target instanceof Node)) return;
      // Support Shadow DOM / portals via composedPath when available
      const path = getComposedPath(e) as unknown as EventTarget[] | null;
      if (path && Array.isArray(path)) {
        for (const node of path) {
          try {
            if (node instanceof Element && node.closest) {
              if (
                node.closest('[data-dialog-content="true"]') ||
                node.closest('[data-board-picker="true"]') ||
                node.closest('[data-color-picker="true"]') ||
                node.closest('[data-dropdown-content="true"]')
              ) {
                return; // click inside dialog or known popover
              }
            }
          } catch {
            // ignore
          }
        }
      }
      // Fallback to DOM traversal
      const targetEl = e.target as Element;
      if (targetEl.closest && (
        targetEl.closest('[data-dialog-content="true"]') ||
        targetEl.closest('[data-board-picker="true"]') ||
        targetEl.closest('[data-color-picker="true"]') ||
        targetEl.closest('[data-dropdown-content="true"]')
      )) return;
      handleClose();
    };
    // Use capture phase so clicks that call stopPropagation are still caught
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [isOpen, handleClose]);

  // Close board picker when focus moves outside picker and toggle
  useEffect(() => {
    if (!showBoardPicker) return;
    const onFocusIn = (e: FocusEvent) => {
      if (suppressCloseRef.current) return;
      const path = getComposedPath(e) as unknown as EventTarget[] | null;
      if (path && Array.isArray(path)) {
        for (const node of path) {
          try {
            if (node instanceof Element && node.closest && node.closest('[data-board-picker="true"]')) {
              return; // focused inside picker
            }
            if (boardToggleRef.current && node === boardToggleRef.current) return;
          } catch {
            // ignore
          }
        }
      }
      const target = e.target as Element;
      if (target && target.closest && target.closest('[data-board-picker="true"]')) return;
      if (boardToggleRef.current && (boardToggleRef.current === target || boardToggleRef.current.contains(target as Node))) return;
      setShowBoardPicker(false);
    };
    document.addEventListener('focusin', onFocusIn, true);
    return () => document.removeEventListener('focusin', onFocusIn, true);
  }, [showBoardPicker]);
  
  // Close color picker when focus moves outside picker and toggle
  useEffect(() => {
    if (!showColorPicker) return;
    const onFocusIn = (e: FocusEvent) => {
      if (suppressCloseRef.current) return;
      const path = getComposedPath(e) as unknown as EventTarget[] | null;
      if (path && Array.isArray(path)) {
        for (const node of path) {
          try {
            if (node instanceof Element && node.closest && node.closest('[data-color-picker="true"]')) {
              return; // focused inside color picker
            }
            if (colorToggleRef.current && node === colorToggleRef.current) return;
          } catch {
            // ignore
          }
        }
      }
      const target = e.target as Element;
      if (target && target.closest && target.closest('[data-color-picker="true"]')) return;
      if (colorToggleRef.current && (colorToggleRef.current === target || colorToggleRef.current.contains(target as Node))) return;
      setShowColorPicker(false);
    };
    document.addEventListener('focusin', onFocusIn, true);
    return () => document.removeEventListener('focusin', onFocusIn, true);
  }, [showColorPicker]);

  // Also close color picker on pointerdown outside (capture) to handle mouse/pen clicks
  useEffect(() => {
    if (!showColorPicker) return;
    const onPointerDown = (e: PointerEvent) => {
      if (suppressCloseRef.current) return;
      if (!(e.target instanceof Node)) return;
      const path = getComposedPath(e) as unknown as EventTarget[] | null;
      if (path && Array.isArray(path)) {
        for (const node of path) {
          try {
            if (node instanceof Element && node.closest && node.closest('[data-color-picker="true"]')) {
              return; // click inside color picker
            }
            if (colorToggleRef.current && node === colorToggleRef.current) return;
          } catch {
            // ignore
          }
        }
      }
      const targetEl = e.target as Element;
      if (targetEl.closest && targetEl.closest('[data-color-picker="true"]')) return;
      if (colorToggleRef.current && (colorToggleRef.current === targetEl || colorToggleRef.current.contains(targetEl as Node))) return;
      setShowColorPicker(false);
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [showColorPicker]);
  
  const handleUpdate = async () => {
    if (!card || !content.trim()) {
      toast.error("Content cannot be empty");
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        id: card._id,
        content,
        color: selectedColor,
        linkedReferences: linkedReferences.length ? linkedReferences.map(r => ({ type: r.type, boardId: r.boardId, url: r.url, name: r.name, color: r.color })) : undefined,
        linkedBoardId,
        linkedUrl,
        categories,
      };
      type UpdateArgs = Parameters<typeof updateCard>[0];
      await updateCard(payload as unknown as UpdateArgs);
      toast.success("Card updated");
      handleClose();
    } catch (error) {
      console.error("Failed to update card:", error);
      toast.error("Failed to update card");
    } finally {
      setIsSaving(false);
    }
  };

  if (!card) return null;

  const selectedBoardName = (allBoards || []).find(b => b._id === linkedBoardId)?.name;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent ref={dialogRef} data-dialog-content="true" className="bg-[#2a2a2a] text-gray-300 border-[#3a3a3a] max-w-[96vw] w-[900px] max-h-[96vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit card</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 overflow-y-auto pr-2 flex-1 min-h-0">
          {/* Card options toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Color picker */}
            <div className="relative">
              <button
                ref={colorToggleRef}
                onClick={() => { setShowColorPicker(!showColorPicker); setShowBoardPicker(false); }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors",
                  showColorPicker 
                    ? "bg-[#3a3a3a] border-[#4a4a4a]" 
                    : "bg-[#1a1a1a] border-[#3a3a3a] hover:bg-[#2a2a2a]"
                )}
              >
                <Palette className="w-4 h-4 text-gray-400" />
                <span className="text-sm">Color</span>
                <div 
                  className="w-4 h-4 rounded border border-gray-500"
                  style={{ backgroundColor: selectedColor }}
                />
              </button>
              
              {showColorPicker && (
                <div data-color-picker="true" className="absolute top-full left-0 mt-1 p-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg shadow-xl z-50">
                  <HudColorPicker
                    color={selectedColor}
                    onPreview={(c) => setSelectedColor(c)}
                    onChange={(c) => setSelectedColor(c)}
                    onClose={() => setShowColorPicker(false)}
                    presetColors={CARD_COLORS}
                  />
                </div>
              )}
            </div>

            {/* Linked board / external URL picker */}
            <div className="relative">
              <button
                ref={boardToggleRef}
                onClick={() => { setShowBoardPicker(!showBoardPicker); setShowColorPicker(false); }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors",
                  showBoardPicker || linkedBoardId || linkedUrl || linkedReferences.length > 0
                    ? "bg-[#3a3a3a] border-[#4a4a4a]" 
                    : "bg-[#1a1a1a] border-[#3a3a3a] hover:bg-[#2a2a2a]"
                )}
              >
                <Link2 className="w-4 h-4 text-gray-400" />
                <span className="text-sm">
                  {linkedReferences.length > 1 ? `Linked to ${linkedReferences.length} items` : linkedReferences.length === 1 ? `Linked: ${(linkedReferences[0].name)}` : linkedBoardId ? `Linked: ${selectedBoardName}` : linkedUrl ? `Linked: ${linkedUrl}` : "Link to Board/URL"}
                </span>
              </button>
              
              {showBoardPicker && (
                <div data-board-picker="true" className="absolute top-full left-0 mt-1 p-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg shadow-xl z-50 max-h-56 overflow-y-auto min-w-[240px]">
                    <div className="px-1 pb-2">
                      <label className="text-xs text-gray-400 mb-1 block">External URL</label>
                      <div className="flex flex-col gap-2">
                        <input
                          type="text"
                          value={linkedUrl || ''}
                          onChange={(e) => setLinkedUrl(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === ' ') {
                              e.stopPropagation();
                            }
                          }}
                          placeholder="https://example.com"
                          className="flex-1 px-2 py-1 bg-[#1a1a1a] border border-[#333333] rounded text-sm text-gray-200"
                        />
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={linkedUrlTitle || ''}
                            onChange={(e) => setLinkedUrlTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === ' ') {
                                e.stopPropagation();
                              }
                            }}
                            placeholder="Title (optional)"
                            className="flex-1 px-2 py-1 bg-[#1a1a1a] border border-[#333333] rounded text-sm text-gray-200"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!linkedUrl) return;
                              const normalized = normalizeUrl(linkedUrl);
                              if (!normalized) {
                                toast.error('Invalid URL');
                                return;
                              }
                              setLinkedBoardId(undefined);
                              setLinkedReferences(prev => [...prev, { id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`, type: 'url', url: normalized, name: linkedUrlTitle || new URL(normalized).hostname, color: '#3a3a3a' }]);
                              setLinkedUrl(undefined);
                              setLinkedUrlTitle(undefined);
                              setShowBoardPicker(false);
                            }}
                            className="w-8 h-8 flex items-center justify-center bg-[#3a3a3a] rounded text-sm text-gray-200"
                            title="Add URL"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  <hr className="border-[#333333] my-2" />
                  <div className="mb-2">
                    <div className="text-xs text-gray-400 mb-2 px-1">Add board link</div>
                    <HierarchicalBoardPicker
                      boards={(allBoards || []) as BoardType[]}
                      linkedBoardIds={new Set(linkedReferences.filter(r => r.type === 'board').map(r => r.boardId as Id<"boards">))}
                      excludeBoardId={card?.boardId}
                      onAddBoard={(board) => {
                        suppressCloseRef.current = true;
                        setTimeout(() => (suppressCloseRef.current = false), 150);
                        setLinkedReferences(prev => {
                          const exists = (prev || []).some(r => r.type === 'board' && r.boardId === board._id);
                          if (exists) return prev;
                          return [...(prev || []), { id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`, type: 'board', boardId: board._id, name: board.name, color: '#3a3a3a' }];
                        });
                      }}
                    />
                  </div>
                  <div className="mb-2">
                    <div className="text-xs text-gray-400 mb-1">Current references</div>
                    {linkedReferences.length === 0 ? (
                      <div className="text-gray-500 text-sm px-3 py-2">No references added</div>
                    ) : (
                      linkedReferences.map((r, idx) => (
                        <div key={r.id || idx} className="flex items-center gap-2 px-2 py-1 relative">
                          {r.type === 'url' ? (
                            <input
                              type="text"
                              value={r.name || ''}
                              onChange={(e) => { const v = e.target.value; setLinkedReferences(prev => { const copy = [...prev]; copy[idx] = { ...copy[idx], name: v }; return copy; }); }}
                              onKeyDown={(e) => {
                                if (e.key === ' ') {
                                  e.stopPropagation();
                                }
                              }}
                              className="flex-1 px-2 py-1 bg-[#1a1a1a] border border-[#333333] rounded text-sm text-gray-200"
                              placeholder="Title (optional)"
                            />
                          ) : (
                            <div 
                              className="flex-1 text-sm text-gray-200 cursor-pointer hover:text-green-400 transition-colors duration-200 relative group"
                              onMouseEnter={() => setHoveredRefIdx(idx)}
                              onMouseLeave={() => setHoveredRefIdx(null)}
                            >
                              {r.name}
                              {hoveredRefIdx === idx && r.boardId && (
                                <div className="absolute left-0 top-full mt-1 z-[9999] bg-[#2a2a2a] border border-green-500/30 rounded px-2 py-1.5 whitespace-nowrap flex items-center gap-1.5 text-xs text-green-400 shadow-xl animate-in fade-in slide-in-from-top-1 duration-200">
                                  <span className="font-medium">Links to:</span>
                                  <span className="text-gray-300">{getBoardPath(r.boardId)}</span>
                                  <ArrowRight className="w-3 h-3 animate-pulse" />
                                </div>
                              )}
                            </div>
                          )}
                          {/* color selection removed per UX request */}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeRef(idx); }}
                            onPointerDownCapture={(e) => {
                              e.stopPropagation();
                              suppressCloseRef.current = true;
                              setTimeout(() => (suppressCloseRef.current = false), 150);
                              removeRef(idx);
                            }}
                            className="w-8 h-8 flex items-center justify-center text-red-400"
                            title="Remove reference"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  {/* categories moved out of picker */}
                </div>
              )}
            </div>
            {/* End Linked board / external URL picker */}
          </div>
            {/* Use the shared MenuBar component */}
            <MenuBar 
              editor={editor} 
              linkableBoards={allBoards || []}
              boardId={card?.boardId} 
            />

            {/* Categories (separate from board/url picker) */}
            <div className="mb-2">
              <div className="text-xs text-gray-400 mb-1">Categories</div>
              <div className="flex gap-2 items-center mb-2">
                <input
                  type="text"
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === ' ') {
                      e.stopPropagation();
                    }
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const v = categoryInput.trim();
                      if (!v) return;
                      setCategories(prev => prev.includes(v) ? prev : [...prev, v]);
                      setCategoryInput('');
                    }
                  }}
                  placeholder="Add category and press Enter"
                  className="flex-1 px-2 py-1 bg-[#1a1a1a] border border-[#333333] rounded text-sm text-gray-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    const v = categoryInput.trim();
                    if (!v) return;
                    setCategories(prev => prev.includes(v) ? prev : [...prev, v]);
                    setCategoryInput('');
                  }}
                  className="w-8 h-8 flex items-center justify-center bg-[#3a3a3a] rounded text-sm text-gray-200"
                  title="Add category"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((c, i) => (
                  <div key={`${c}-${i}`} className="flex items-center gap-2 px-2 py-1 rounded-full bg-[#3a3a3a] text-sm text-gray-200">
                    <span>{c}</span>
                    <button type="button" onClick={() => setCategories(prev => prev.filter(x => x !== c))} className="text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          <div 
            className="min-h-[200px] max-h-[400px] p-4 rounded-lg overflow-y-auto border-2 flex-shrink-0"
            style={{ 
              backgroundColor: selectedColor === "#2a2a2a" ? "#1a1a1a" : selectedColor,
              borderColor: selectedColor === "#2a2a2a" ? "#3a3a3a" : selectedColor
            }}
          >
            {/* Use shared editor styles */}
            <EditorStyles />
            <EditorContent editor={editor} className="text-gray-200" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 pt-5 mt-4 border-t border-[#3a3a3a] flex-shrink-0">
          <Button
            variant="outline"
            onClick={handleClose}
            className="px-4 bg-[#2a2a2a] border-[#3a3a3a] hover:bg-[#3a3a3a] text-gray-300 transition-colors"
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdate}
            className="px-4 bg-[#3a3a3a] hover:bg-[#4a4a4a] text-gray-200 font-medium transition-colors border border-[#3a3a3a]"
            disabled={isSaving}
          >
            {isSaving ? (
              <span className="flex items-center">
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </span>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};