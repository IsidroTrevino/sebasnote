import { useState, useRef, useCallback, useEffect } from "react";
import { Doc } from "../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Loader, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useUpdateCardModal } from "@/features/boards/store/useUpdateCardModal";
import { useImageDialog } from "@/features/boards/store/useImageDialog";


interface CardProps {
  card: Doc<"cards">;
}

type LinkedReference = {
  type: string;
  boardId?: string;
  url?: string;
  name?: string;
  color?: string;
};

export const Card = ({ card }: CardProps) => {
  const [width, setWidth] = useState(card.width || 300);
  const [height, setHeight] = useState(card.height || 200);
  const [isResizing, setIsResizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const startResizeRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const updateCard = useMutation(api.cards.update);
  const deleteCard = useMutation(api.cards.deleteCard);
  const { onOpen } = useUpdateCardModal();
  const router = useRouter();
  const { open: openImageDialog } = useImageDialog();


  const originalDims = useRef({ width: card.width || 300, height: card.height || 200 });

  useEffect(() => {
    setWidth(card.width || 300);
    setHeight(card.height || 200);
    originalDims.current = { width: card.width || 300, height: card.height || 200 };
  }, [card.width, card.height]);

  // Add hover tooltips for links in card content
  useEffect(() => {
    if (!cardRef.current) return;

    const cardEl = cardRef.current;
    let linkTooltipEl: HTMLDivElement | null = null;

    const removeLinkTooltip = () => {
      if (linkTooltipEl && linkTooltipEl.parentNode) {
        linkTooltipEl.parentNode.removeChild(linkTooltipEl);
      }
      linkTooltipEl = null;
    };

    const createLinkTooltip = (href: string, x: number, y: number) => {
      removeLinkTooltip();
      linkTooltipEl = document.createElement('div');
      linkTooltipEl.style.position = 'fixed';
      linkTooltipEl.style.left = `${x}px`;
      linkTooltipEl.style.top = `${y + 10}px`;
      linkTooltipEl.style.pointerEvents = 'none';
      linkTooltipEl.style.zIndex = '9999';
      linkTooltipEl.style.padding = '6px 8px';
      linkTooltipEl.style.background = '#2a2a2a';
      linkTooltipEl.style.borderRadius = '6px';
      linkTooltipEl.style.border = '1px solid rgba(34, 197, 94, 0.3)';
      linkTooltipEl.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)';
      linkTooltipEl.style.display = 'flex';
      linkTooltipEl.style.alignItems = 'center';
      linkTooltipEl.style.gap = '6px';
      linkTooltipEl.style.fontSize = '12px';
      linkTooltipEl.style.whiteSpace = 'nowrap';
      linkTooltipEl.style.maxWidth = '400px';

      const label = document.createElement('span');
      label.textContent = 'Links to:';
      label.style.fontWeight = '500';
      label.style.color = '#22c55e';

      const path = document.createElement('span');
      path.textContent = href;
      path.style.color = '#d1d5db';
      path.style.overflow = 'hidden';
      path.style.textOverflow = 'ellipsis';

      const arrow = document.createElement('span');
      arrow.innerHTML = '→';
      arrow.style.color = '#22c55e';

      linkTooltipEl.appendChild(label);
      linkTooltipEl.appendChild(path);
      linkTooltipEl.appendChild(arrow);
      document.body.appendChild(linkTooltipEl);
    };

    const onClick = (e: Event) => {
      const me = e as MouseEvent;
      const target = e.target as HTMLElement;
      const anchor = target.closest('a') as HTMLAnchorElement | null;
      const href = anchor?.getAttribute('href') || '';
      const hasMod = me.metaKey || me.ctrlKey;

      if (anchor && href && !href.startsWith('#')) {
        // Require Ctrl/Cmd + Click to navigate
        if (hasMod && href.startsWith('/')) {
          me.preventDefault();
          me.stopPropagation();
          me.stopImmediatePropagation();
          router.push(href);
        } else {
          // Prevent default link behavior without modifier key
          me.preventDefault();
          me.stopPropagation();
          me.stopImmediatePropagation();
        }
      }
    };

    const onMouseOver = (e: Event) => {
      const me = e as MouseEvent;
      const target = e.target as HTMLElement;
      const anchor = target.closest('a') as HTMLAnchorElement | null;
      const href = anchor?.getAttribute('href') || '';

      if (anchor && href) {
        createLinkTooltip(href, me.clientX, me.clientY);
      }
    };

    const onMouseOut = (e: Event) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a') as HTMLAnchorElement | null;

      if (anchor) {
        removeLinkTooltip();
      }
    };

    cardEl.addEventListener('click', onClick, true);
    cardEl.addEventListener('mouseover', onMouseOver);
    cardEl.addEventListener('mouseout', onMouseOut);

    return () => {
      cardEl.removeEventListener('click', onClick, true);
      cardEl.removeEventListener('mouseover', onMouseOver);
      cardEl.removeEventListener('mouseout', onMouseOut);
      removeLinkTooltip();
    };
  }, [router]);

  // Store current dimensions in refs for event handlers
  const widthRef = useRef(width);
  const heightRef = useRef(height);
  
  // Update refs when state changes
  useEffect(() => {
    widthRef.current = width;
    heightRef.current = height;
  }, [width, height]);
  
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    
    if (cardRef.current) {
      startResizeRef.current = {
        x: e.clientX,
        y: e.clientY,
        width: widthRef.current,
        height: heightRef.current
      };
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !startResizeRef.current) return;

    const deltaX = e.clientX - startResizeRef.current.x;
    const deltaY = e.clientY - startResizeRef.current.y;

    const newWidth = Math.max(200, startResizeRef.current.width + deltaX);
    const newHeight = Math.max(150, startResizeRef.current.height + deltaY);

    setWidth(newWidth);
    setHeight(newHeight);
  }, [isResizing]);

  const handleMouseUp = useCallback(async () => {
    if (!isResizing) return;

    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
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
  }, [isResizing, updateCard, card._id, handleMouseMove]);

  // Clean up event listeners if component unmounts during resize
  useEffect(() => {
    return () => {
      if (isResizing) {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      }
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Intercept link clicks and handle reference-image previews in card content
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
      const me = e as MouseEvent;
      const target = e.target as HTMLElement;
      const anchor = target.closest('a') as HTMLAnchorElement | null;
      const href = anchor?.getAttribute('href') || '';
      const hasMod = me.metaKey || me.ctrlKey;
      const refUrl = getRefImageUrl(href);

      if (anchor && refUrl) {
        e.preventDefault();
        openImageDialog(refUrl);
        return;
      }

      if (anchor && href.startsWith('/') && hasMod) {
        e.preventDefault();
        router.push(href);
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

    const onMouseMove = (e: Event) => {
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
    el.addEventListener('mousemove', onMouseMove);

    return () => {
      el.removeEventListener('click', onClick);
      el.removeEventListener('mouseover', onMouseOver);
      el.removeEventListener('mouseout', onMouseOut);
      el.removeEventListener('mousemove', onMouseMove);
      removePreview();
    };
  }, [router, openImageDialog]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDeleting) return;
    
    try {
      setIsDeleting(true);
      await deleteCard({ id: card._id });
      toast.success("Card deleted");
    } catch (error) {
      console.error("Failed to delete card:", error);
      toast.error("Failed to delete card");
      setIsDeleting(false);
    }
  };

  return (
    <div 
      ref={cardRef}
      className="bg-[#2a2a2a] border border-[#3a3a3a] rounded-md shadow-lg overflow-hidden relative"
      style={{ 
        width: `${width}px`, 
        height: `${height}px`,
        cursor: isResizing ? 'nwse-resize' : 'default'
      }}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {(isHovering || isDeleting) && (
        <>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className={`
              absolute top-2 right-2 
              p-1.5 
              rounded-full
              bg-red-500/80
              hover:bg-red-600 
              transition-all
              z-10
              ${isDeleting ? 'cursor-not-allowed opacity-50' : ''}
            `}
          >
            {isDeleting ? (
              <Loader className="h-4 w-4 text-white animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 text-white" />
            )}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpen(card);
            }}
            className={`
              absolute top-2 right-10
              p-1.5 
              rounded-full
              bg-blue-500/80
              hover:bg-blue-600 
              transition-all
              z-10
            `}
          >
            <Pencil className="h-4 w-4 text-white" />
          </button>
        </>
      )}
      <div className="p-4 overflow-auto h-full">
        {card.categories && Array.isArray(card.categories) && card.categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {card.categories.map((c: string, i: number) => (
              <div key={`${c}-${i}`} className="px-2 py-0.5 rounded-full bg-[#3a3a3a] text-xs text-gray-200">
                {c}
              </div>
            ))}
          </div>
        )}
        {card.linkedReferences && Array.isArray(card.linkedReferences) && card.linkedReferences.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {(card.linkedReferences as LinkedReference[]).map((r, i: number) => (
              <div
                key={`${r.name || r.url || r.type}-${i}`}
                className="px-2 py-0.5 rounded-full bg-[#111827] text-xs text-gray-200 flex items-center gap-2"
                title={r.name || r.url || r.type}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: r.color || '#6b7280' }} />
                <span className="truncate max-w-[10rem]">{r.name || r.url || r.type}</span>
              </div>
            ))}
          </div>
        )}
        <style jsx global>{`
          .card-content p {
            margin: 0.5em 0;
          }
          .card-content ul {
            list-style-type: disc;
            padding-left: 1.5em;
            margin: 0.5em 0;
          }
          .card-content h1 {
            font-size: 1.5em;
            font-weight: bold;
            margin: 0.5em 0;
          }
          .card-content h2 {
            font-size: 1.3em;
            font-weight: bold;
            margin: 0.5em 0;
          }
          .card-content h3 {
            font-size: 1.1em;
            font-weight: bold;
            margin: 0.5em 0;
          }
          .card-content blockquote {
            border-left: 3px solid #4a4a4a;
            padding-left: 1em;
            margin: 0.5em 0;
          }
          .card-content code {
            background: #1a1a1a;
            padding: 0.2em 0.4em;
            border-radius: 3px;
          }
          .card-content pre {
            background: #1a1a1a;
            padding: 0.75em 1em;
            border-radius: 5px;
            margin: 0.5em 0;
          }
          .card-content a {
            color: #60a5fa;
            text-decoration: underline;
          }
        `}</style>
        <div 
          className={cn("card-content text-gray-300")}
          dangerouslySetInnerHTML={{ __html: card.content as string }}
        />
      </div>
      
      <div 
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize bg-[#3a3a3a] hover:bg-[#4a4a4a] transition-colors"
        onMouseDown={handleMouseDown}
      />
      
      {isSaving && (
        <div className="absolute top-2 right-2">
          <Loader className="h-4 w-4 animate-spin text-gray-400" />
        </div>
      )}
    </div>
  );
};
