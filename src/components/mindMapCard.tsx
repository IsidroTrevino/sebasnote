'use client';

import { useState, useRef, useEffect, useMemo } from "react";
import { Doc, Id } from "../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { 
  Loader, 
  Pencil, 
  Trash2, 
  Link2, 
  Palette, 
  ExternalLink,
  Circle
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { normalizeUrl } from '@/lib/utils';
import { useUpdateCardModal } from "@/features/boards/store/useUpdateCardModal";
import { useImageDialog } from "@/features/boards/store/useImageDialog";
import { useConnectionStore } from "@/features/boards/store/useConnectionStore";
import { HudColorPicker } from "./hudColorPicker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Predefined colors for mind map cards
const CARD_COLOR_PRESETS = [
  { name: "Default", value: "#2a2a2a" },
  { name: "Dark Gray", value: "#1a1a1a" },
  { name: "Charcoal", value: "#374151" },
  { name: "Dark Red", value: "#7f1d1d" },
  { name: "Red", value: "#991b1b" },
  { name: "Bright Red", value: "#dc2626" },
  { name: "Dark Orange", value: "#7c2d12" },
  { name: "Orange", value: "#c2410c" },
  { name: "Bright Orange", value: "#ea580c" },
  { name: "Dark Yellow", value: "#713f12" },
  { name: "Yellow", value: "#a16207" },
  { name: "Bright Yellow", value: "#ca8a04" },
  { name: "Dark Green", value: "#14532d" },
  { name: "Green", value: "#166534" },
  { name: "Bright Green", value: "#16a34a" },
  { name: "Dark Teal", value: "#134e4a" },
  { name: "Teal", value: "#0f766e" },
  { name: "Bright Teal", value: "#0d9488" },
  { name: "Dark Blue", value: "#1e3a5f" },
  { name: "Blue", value: "#1e40af" },
  { name: "Bright Blue", value: "#2563eb" },
  { name: "Dark Purple", value: "#4c1d95" },
  { name: "Purple", value: "#6b21a8" },
  { name: "Bright Purple", value: "#9333ea" },
  { name: "Dark Pink", value: "#831843" },
  { name: "Pink", value: "#9d174d" },
  { name: "Bright Pink", value: "#db2777" },
];

type LinkedReference = {
  type: string;
  boardId?: string;
  url?: string;
  name?: string;
  color?: string;
};

// Process card content to apply data attributes as inline styles for images
const processCardContent = (html: string): string => {
  if (typeof window === 'undefined') return html;
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // Process all image wrappers (spans with data-float or class tiptap-image-wrapper)
  const wrappers = doc.querySelectorAll('span[data-float], .tiptap-image-wrapper');
  wrappers.forEach((wrapper) => {
    const el = wrapper as HTMLElement;
    const float = el.getAttribute('data-float');
    const vshift = el.getAttribute('data-vshift');
    
    el.style.display = 'inline-block';
    el.style.position = 'relative';
    el.style.maxWidth = '100%';
    
    if (float === 'left') {
      el.style.cssFloat = 'left';
      el.style.marginRight = '12px';
      el.style.marginBottom = '12px';
      el.style.marginLeft = '0';
    } else if (float === 'right') {
      el.style.cssFloat = 'right';
      el.style.marginLeft = '12px';
      el.style.marginBottom = '12px';
      el.style.marginRight = '0';
    }
    
    if (vshift) {
      el.style.marginTop = vshift;
    }
  });
  
  // Process all images - check for data attributes on the image itself
  const allImages = doc.querySelectorAll('img');
  allImages.forEach((img) => {
    const el = img as HTMLImageElement;
    const width = el.getAttribute('data-width');
    const float = el.getAttribute('data-float');
    const vshift = el.getAttribute('data-vshift');
    
    // Apply width
    if (width) {
      el.style.width = width;
      el.style.maxWidth = 'none';
      el.style.height = 'auto';
    } else {
      el.style.maxWidth = '100%';
      el.style.height = 'auto';
    }
    
    // Apply float - wrap image in a span if needed
    if (float === 'left' || float === 'right') {
      // Check if parent is already a wrapper with float
      const parent = el.parentElement;
      if (parent && parent.tagName === 'SPAN' && parent.getAttribute('data-float')) {
        // Parent already handles float
        return;
      }
      
      // Create a wrapper span for float
      const wrapper = doc.createElement('span');
      wrapper.style.display = 'inline-block';
      wrapper.style.position = 'relative';
      
      if (float === 'left') {
        wrapper.style.cssFloat = 'left';
        wrapper.style.marginRight = '12px';
        wrapper.style.marginBottom = '12px';
        wrapper.style.marginLeft = '0';
      } else if (float === 'right') {
        wrapper.style.cssFloat = 'right';
        wrapper.style.marginLeft = '12px';
        wrapper.style.marginBottom = '12px';
        wrapper.style.marginRight = '0';
      }
      
      if (vshift) {
        wrapper.style.marginTop = vshift;
      }
      
      // Wrap the image
      el.parentNode?.insertBefore(wrapper, el);
      wrapper.appendChild(el);
    }
  });
  
  return doc.body.innerHTML;
};

interface MindMapCardProps {
  card: Doc<"cards">;
  onPositionChange: (id: Id<"cards">, x: number, y: number) => void;
  scale: number;
  linkedBoardName?: string;
  boardId?: Id<'boards'>;
}

export const MindMapCard = ({ 
  card, 
  onPositionChange, 
  scale,
  linkedBoardName
}: MindMapCardProps) => {
  const [width, setWidth] = useState(card.width || 300);
  const [height, setHeight] = useState(card.height || 200);
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isColorPickerDragging, setIsColorPickerDragging] = useState(false);
  const [previewColor, setPreviewColor] = useState<string>(card.color || "#2a2a2a");
  
  const cardRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const startResizeRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const startDragRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);
  
  const updateCard = useMutation(api.cards.update);
  const updatePosition = useMutation(api.cards.updatePosition);
  const updateColor = useMutation(api.cards.updateColor);
  const deleteCard = useMutation(api.cards.deleteCard);
  
  const { onOpen } = useUpdateCardModal();
  const router = useRouter();
  const { open: openImageDialog } = useImageDialog();
  const { isConnecting, sourceCardId, startConnection, endConnection } = useConnectionStore();

  const originalDims = useRef({ width: card.width || 300, height: card.height || 200 });

  // Casted card convenience fields (generated Convex types may not include these custom fields)
  const cardCategories = (card as unknown as { categories?: string[] }).categories;
  const cardLinkedReferences = (card as unknown as { linkedReferences?: LinkedReference[] }).linkedReferences;

  // Click outside handler for color picker
  useEffect(() => {
    if (!showColorPicker) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      // Don't close if dragging the color picker
      if (isColorPickerDragging) return;
      
      // Check if click is outside the color picker
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    };
    
    // Add listener with a small delay to prevent immediate close
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColorPicker, isColorPickerDragging]);

  // Memoize processed content for image rendering
  const processedContent = useMemo(() => {
    return processCardContent(card.content as string);
  }, [card.content]);

  useEffect(() => {
    setWidth(card.width || 300);
    setHeight(card.height || 200);
    originalDims.current = { width: card.width || 300, height: card.height || 200 };
  }, [card.width, card.height]);

  // Keep preview color in sync when card prop changes
  useEffect(() => {
    setPreviewColor(card.color || "#2a2a2a");
  }, [card.color]);

  const widthRef = useRef(width);
  const heightRef = useRef(height);
  
  useEffect(() => {
    widthRef.current = width;
    heightRef.current = height;
  }, [width, height]);

  // ============ DRAG HANDLING ============
  const handleDragStart = (e: React.MouseEvent) => {
    // Don't start dragging when interacting with controls or links inside the card
    if (isResizing || (e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) return;
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    startDragRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: card.positionX || 100,
      posY: card.positionY || 100
    };

    // Track the current position during drag
    let currentX = card.positionX || 100;
    let currentY = card.positionY || 100;

    const onMouseMove = (e: MouseEvent) => {
      if (!startDragRef.current) return;

      const deltaX = (e.clientX - startDragRef.current.x) / scale;
      const deltaY = (e.clientY - startDragRef.current.y) / scale;

      currentX = startDragRef.current.posX + deltaX;
      currentY = startDragRef.current.posY + deltaY;

      onPositionChange(card._id, currentX, currentY);
    };

    const onMouseUp = async () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      setIsDragging(false);

      if (startDragRef.current) {
        startDragRef.current = null;

        try {
          await updatePosition({
            id: card._id,
            positionX: currentX,
            positionY: currentY,
          });
        } catch (error) {
          console.error("Failed to update position:", error);
          toast.error("Failed to save position");
        }
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // ============ RESIZE HANDLING ============
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    
    startResizeRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: widthRef.current,
      height: heightRef.current
    };

    const onResizeMove = (e: MouseEvent) => {
      if (!startResizeRef.current) return;

      const deltaX = (e.clientX - startResizeRef.current.x) / scale;
      const deltaY = (e.clientY - startResizeRef.current.y) / scale;

      const newWidth = Math.max(200, startResizeRef.current.width + deltaX);
      const newHeight = Math.max(150, startResizeRef.current.height + deltaY);

      setWidth(newWidth);
      setHeight(newHeight);
    };

    const onResizeEnd = async () => {
      document.removeEventListener('mousemove', onResizeMove);
      document.removeEventListener('mouseup', onResizeEnd);
      setIsResizing(false);

      try {
        if (widthRef.current !== originalDims.current.width || heightRef.current !== originalDims.current.height) {
          setIsSaving(true);
          await updateCard({
            id: card._id,
            width: widthRef.current,
            height: heightRef.current,
          });
          originalDims.current = { width: widthRef.current, height: heightRef.current };
        }
      } catch (error) {
        console.error("Failed to update card dimensions:", error);
        setWidth(originalDims.current.width);
        setHeight(originalDims.current.height);
        toast.error("Failed to resize card");
      } finally {
        setIsSaving(false);
      }
    };

    document.addEventListener('mousemove', onResizeMove);
    document.addEventListener('mouseup', onResizeEnd);
  };

  // ============ COLOR HANDLING ============
  const handleColorChange = async (color: string) => {
    try {
      await updateColor({ id: card._id, color });
      // Don't close picker - let user continue adjusting
    } catch (error) {
      console.error("Failed to update color:", error);
      toast.error("Failed to update color");
    }
  };

  // ============ CONNECTION HANDLING ============
  const handleConnectionClick = () => {
    if (isConnecting && sourceCardId) {
      if (sourceCardId === card._id) {
        toast.error("Cannot connect card to itself");
        return;
      }
      // Complete the connection - handled by parent
      endConnection();
    } else {
      // Start a new connection
      startConnection(card._id);
      toast.info("Click another card to create a connection");
    }
  };

  // ============ DELETE HANDLING ============
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeleting) return;
    setShowDeleteConfirm(true);
  };

  const performDelete = async () => {
    if (isDeleting) return;
    try {
      setIsDeleting(true);
      setShowDeleteConfirm(false);
      await deleteCard({ id: card._id });
      toast.success("Card deleted");
    } catch (error) {
      console.error("Failed to delete card:", error);
      toast.error("Failed to delete card");
      setIsDeleting(false);
    }
  };

  // ============ LINKED BOARD NAVIGATION ============
  // Card-level linking disabled: prefer inline links inside card content.

  // Link click handling
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    let previewEl: HTMLDivElement | null = null;

    const removePreview = () => {
      if (previewEl && previewEl.parentNode) {
        previewEl.parentNode.removeChild(previewEl);
      }
      previewEl = null;
    };

    const createPreview = (url: string) => {
      removePreview();
      previewEl = document.createElement('div');
      previewEl.style.position = 'fixed';
      previewEl.style.pointerEvents = 'none';
      previewEl.style.zIndex = '9999';
      previewEl.style.padding = '4px';
      previewEl.style.background = 'rgba(0,0,0,0.7)';
      previewEl.style.borderRadius = '6px';
      previewEl.style.border = '1px solid #3a3a3a';
      const img = document.createElement('img');
      img.src = url;
      img.style.maxWidth = '200px';
      img.style.maxHeight = '140px';
      img.style.display = 'block';
      img.style.borderRadius = '4px';
      previewEl.appendChild(img);
      document.body.appendChild(previewEl);
    };

    const getRefImageUrl = (href: string) => {
      if (!href) return null;
      if (href.startsWith('#image:')) {
        try {
          return decodeURIComponent(href.slice(7));
        } catch {
          return href.slice(7);
        }
      }
      return null;
    };

    const onClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a') as HTMLAnchorElement | null;
      const href = anchor?.getAttribute('href') || '';
      const refUrl = getRefImageUrl(href);

      if (anchor && refUrl) {
        e.preventDefault();
        openImageDialog(refUrl);
        return;
      }
      if (anchor) {
        // Internal route -> navigate in-app
        if (href.startsWith('/')) {
          e.preventDefault();
          e.stopPropagation();
          router.push(href);
          return;
        }

        // External link -> open in new tab
        if (/^https?:\/\//.test(href)) {
          e.preventDefault();
          e.stopPropagation();
          try { window.open(href, anchor.target || '_blank'); } catch {};
          return;
        }
      }
    };

    const onMouseOver = (e: Event) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a') as HTMLAnchorElement | null;
      const href = anchor?.getAttribute('href') || '';
      const refUrl = getRefImageUrl(href);
      if (anchor && refUrl) {
        createPreview(refUrl);
      }
    };

    const onMouseOut = (e: Event) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a') as HTMLAnchorElement | null;
      const href = anchor?.getAttribute('href') || '';
      const refUrl = getRefImageUrl(href);
      if (anchor && refUrl) {
        removePreview();
      }
    };

    const onMouseMovePreview = (e: Event) => {
      const me = e as MouseEvent;
      if (previewEl) {
        const offset = 16;
        let x = me.clientX + offset;
        let y = me.clientY + offset;
        if (x + 220 > window.innerWidth) x = me.clientX - 220;
        if (y + 160 > window.innerHeight) y = me.clientY - 160;
        previewEl.style.left = `${x}px`;
        previewEl.style.top = `${y}px`;
      }
    };

    el.addEventListener('click', onClick);
    el.addEventListener('mouseover', onMouseOver);
    el.addEventListener('mouseout', onMouseOut);
    el.addEventListener('mousemove', onMouseMovePreview);

    return () => {
      el.removeEventListener('click', onClick);
      el.removeEventListener('mouseover', onMouseOver);
      el.removeEventListener('mouseout', onMouseOut);
      el.removeEventListener('mousemove', onMouseMovePreview);
      removePreview();
    };
  }, [router, openImageDialog]);

  const cardColor = previewColor || card.color || "#2a2a2a";
  const isConnectionTarget = isConnecting && sourceCardId !== card._id;

  return (
    <div 
      ref={cardRef}
      className={cn(
        "absolute rounded-3xl shadow-lg overflow-hidden border-2 transition-shadow select-none",
        isDragging && "shadow-2xl z-50",
        isConnectionTarget && "ring-2 ring-blue-500 ring-offset-2 ring-offset-[#1a1a1a] cursor-crosshair"
      )}
      style={{ 
        left: `${card.positionX || 100}px`,
        top: `${card.positionY || 100}px`,
        width: `${width}px`, 
        height: `${height}px`,
        backgroundColor: cardColor,
        borderColor: cardColor === "#2a2a2a" ? "#3a3a3a" : cardColor,
        cursor: isDragging ? 'grabbing' : isResizing ? 'nwse-resize' : 'grab'
      }}
      onMouseDown={handleDragStart}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={(e) => {
        setIsHovering(false);
        try {
          const me = e as React.MouseEvent;
          const el = document.elementFromPoint(me.clientX, me.clientY) as HTMLElement | null;
          const overPopup = el && colorPickerRef.current && colorPickerRef.current.contains(el);
          if (!overPopup) {
            setShowColorPicker(false);
          }
        } catch {}
      }}
      onClick={() => {
        if (isConnectionTarget) {
          handleConnectionClick();
        }
      }}
      data-card-id={card._id}
    >
      {/* Connection handles */}
      <div 
        className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full opacity-0 hover:opacity-100 transition-opacity cursor-pointer z-20 flex items-center justify-center"
        onClick={(e) => { e.stopPropagation(); handleConnectionClick(); }}
        data-connection-handle="left"
      >
        <Circle className="w-2 h-2 text-white" />
      </div>
      <div 
        className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full opacity-0 hover:opacity-100 transition-opacity cursor-pointer z-20 flex items-center justify-center"
        onClick={(e) => { e.stopPropagation(); handleConnectionClick(); }}
        data-connection-handle="right"
      >
        <Circle className="w-2 h-2 text-white" />
      </div>
      <div 
        className="absolute left-1/2 -top-2 -translate-x-1/2 w-4 h-4 bg-blue-500 rounded-full opacity-0 hover:opacity-100 transition-opacity cursor-pointer z-20 flex items-center justify-center"
        onClick={(e) => { e.stopPropagation(); handleConnectionClick(); }}
        data-connection-handle="top"
      >
        <Circle className="w-2 h-2 text-white" />
      </div>
      <div 
        className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-4 h-4 bg-blue-500 rounded-full opacity-0 hover:opacity-100 transition-opacity cursor-pointer z-20 flex items-center justify-center"
        onClick={(e) => { e.stopPropagation(); handleConnectionClick(); }}
        data-connection-handle="bottom"
      >
        <Circle className="w-2 h-2 text-white" />
      </div>

      {/* Toolbar */}
      {(isHovering || isDeleting) && !isDragging && (
        <div className="absolute top-2 right-2 flex gap-1 z-10">
          {/* Linked Board indicator */}
          {card.linkedBoardId && (
            <div
              className="p-1.5 rounded-md bg-[#1f1f1f] border border-transparent text-gray-200 flex items-center justify-center"
              title={linkedBoardName || 'linked board'}
            >
              <ExternalLink className="h-4 w-4 text-gray-200" />
            </div>
          )}
          
          {/* Connection button */}
          <button
            onClick={(e) => { e.stopPropagation(); handleConnectionClick(); }}
            className={cn(
              "p-1.5 rounded-md transition-colors border border-transparent",
              isConnecting && sourceCardId === card._id 
                ? "bg-yellow-600 hover:bg-yellow-700 border-yellow-600 text-white" 
                : "bg-[#1f1f1f] hover:bg-[#2a2a2a] hover:border-[#3a3a3a] text-gray-200"
            )}
            title={isConnecting ? "Click another card to connect" : "Create connection"}
          >
            <Link2 className="h-4 w-4" />
          </button>

          {/* Color picker */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowColorPicker(!showColorPicker); }}
              className="p-1.5 rounded-md bg-[#1f1f1f] hover:bg-[#2a2a2a] border border-transparent hover:border-[#3a3a3a] transition-colors"
              title="Change color"
            >
              <Palette className="h-4 w-4 text-gray-200" />
            </button>
            
            {showColorPicker && (
              <div 
                ref={colorPickerRef}
                className="absolute top-full right-0 mt-2 z-50"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <HudColorPicker
                  color={cardColor}
                  onPreview={(c) => setPreviewColor(c)}
                  onChange={handleColorChange}
                  onClose={() => setShowColorPicker(false)}
                  onDraggingChange={setIsColorPickerDragging}
                  presetColors={CARD_COLOR_PRESETS}
                />
              </div>
            )}
          </div>

          {/* Edit button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpen(card);
            }}
            className="p-1.5 rounded-md bg-[#1f1f1f] hover:bg-[#2a2a2a] border border-transparent hover:border-[#3a3a3a] transition-colors"
            title="Edit card"
          >
            <Pencil className="h-4 w-4 text-gray-200" />
          </button>

          {/* Delete button */}
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className={cn(
              "p-1.5 rounded-md transition-colors border border-transparent text-red-400",
              isDeleting ? "cursor-not-allowed opacity-50 bg-transparent" : "hover:bg-red-600/10 hover:border-red-600"
            )}
            title="Delete card"
          >
            {isDeleting ? (
              <Loader className="h-4 w-4 animate-spin text-gray-400" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        </div>
      )}

      {/* Linked board badge */}
      {/* Card-level references (boards or URLs) */}
      {/* Top-left badge stack: categories then linked references (stacked with gap) */}
      {((cardCategories && cardCategories.length > 0) || (cardLinkedReferences && cardLinkedReferences.length > 0) || (card.linkedBoardId && linkedBoardName)) && (
        <div className="absolute top-2 left-2 flex flex-col gap-2 z-10">
          {/* Categories row */}
          {cardCategories && cardCategories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {cardCategories.map((c, idx) => (
                <div
                  key={`${c}-${idx}`}
                  className="px-2 py-1 rounded-full text-xs flex items-center gap-2 border border-transparent bg-[#3a3a3a] text-gray-200"
                  title={c}
                >
                  <span className="truncate max-w-[120px]">{c}</span>
                </div>
              ))}
            </div>
          )}

          {/* Linked references / linked board row */}
          {cardLinkedReferences && cardLinkedReferences.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {cardLinkedReferences.map((r, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (r.type === 'board' && r.boardId) {
                      try { router.push(`/${r.boardId}/${encodeURIComponent(r.name || '')}`); } catch {};
                    } else if (r.type === 'url' && r.url) {
                      try {
                        const dest = normalizeUrl(r.url) || r.url;
                        window.open(dest, '_blank');
                      } catch {
                        try { window.open(r.url, '_blank'); } catch {}
                      }
                    }
                  }}
                  title={r.name || (r.url || '')}
                  className="px-2 py-1 rounded-full text-xs flex items-center gap-1 border border-transparent"
                  style={{ backgroundColor: r.color || '#3a3a3a', color: '#fff' }}
                >
                  <ExternalLink className="w-3 h-3" />
                  <span className="truncate max-w-[120px]">{r.name}</span>
                </button>
              ))}
            </div>
          ) : (card.linkedBoardId && linkedBoardName) && (
            <div 
              className="px-2 py-1 bg-green-600/90 text-white text-xs rounded-full flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              {linkedBoardName}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      {showDeleteConfirm && (
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="max-w-md bg-[#111217] border border-[#2b2b2b] text-gray-200">
            <DialogHeader className="text-left">
              <DialogTitle className="text-gray-100">Delete card</DialogTitle>
              <DialogDescription className="text-sm text-gray-400">Are you sure you want to delete this card? This action cannot be undone.</DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4">
              <div className="flex justify-end gap-2">
                <Button variant="outline" className="border-[#3a3a3a] bg-[#0f0f10] text-gray-200" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                <Button variant="destructive" onClick={performDelete} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Delete'}</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <div className="p-4 overflow-auto h-full">
        <style jsx global>{`
          .mindmap-card-content p {
            margin: 0.5em 0;
          }
          .mindmap-card-content ul {
            list-style-type: disc;
            padding-left: 1.5em;
            margin: 0.5em 0;
          }
          .mindmap-card-content h1 {
            font-size: 1.5em;
            font-weight: bold;
            margin: 0.5em 0;
          }
          .mindmap-card-content h2 {
            font-size: 1.3em;
            font-weight: bold;
            margin: 0.5em 0;
          }
          .mindmap-card-content h3 {
            font-size: 1.1em;
            font-weight: bold;
            margin: 0.5em 0;
          }
          .mindmap-card-content blockquote {
            border-left: 3px solid #4a4a4a;
            padding-left: 1em;
            margin: 0.5em 0;
          }
          .mindmap-card-content code {
            background: #1a1a1a;
            padding: 0.2em 0.4em;
            border-radius: 3px;
          }
          .mindmap-card-content pre {
            background: #1a1a1a;
            padding: 0.75em 1em;
            border-radius: 5px;
            margin: 0.5em 0;
          }
          .mindmap-card-content a {
            color: #60a5fa;
            text-decoration: underline;
          }
          /* Image wrapper styles */
          .mindmap-card-content .tiptap-image-wrapper,
          .mindmap-card-content span[data-float] {
            display: inline-block;
            position: relative;
            max-width: 100%;
          }
          .mindmap-card-content span[data-float="left"] {
            float: left;
            margin-right: 12px;
            margin-bottom: 12px;
          }
          .mindmap-card-content span[data-float="right"] {
            float: right;
            margin-left: 12px;
            margin-bottom: 12px;
          }
          /* Image styles */
          .mindmap-card-content img {
            max-width: 100%;
            height: auto;
            display: block;
          }
          .mindmap-card-content img[data-width] {
            max-width: none;
          }
          /* Clear floats after paragraphs */
          .mindmap-card-content p::after {
            content: "";
            display: table;
            clear: both;
          }
        `}</style>
        <div 
          className={cn(
            "mindmap-card-content text-gray-300",
            ((cardCategories && cardCategories.length > 0) || (cardLinkedReferences && cardLinkedReferences.length > 0) || card.linkedBoardId) && "pt-12"
          )}
          dangerouslySetInnerHTML={{ __html: processedContent }}
        />
      </div>
      
      {/* Resize handle */}
      <div 
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize bg-[#3a3a3a] hover:bg-[#4a4a4a] transition-colors"
        onMouseDown={handleResizeStart}
      />
      
      {isSaving && (
        <div className="absolute top-2 left-2">
          <Loader className="h-4 w-4 animate-spin text-gray-400" />
        </div>
      )}
    </div>
  );
};
