'use client';

import { useCallback, useEffect, useRef, useState } from "react";
import { Doc, Id } from "../../convex/_generated/dataModel";
import { MindMapCard } from "./mindMapCard";
import { ConnectionsLayer } from "./connectionsLayer";
import { useConnectionStore } from "@/features/boards/store/useConnectionStore";
import { useCreateConnection } from "@/features/boards/api/useCreateConnection";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Hand, 
  MousePointer,
  RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MindMapCanvasProps {
  cards: Doc<"cards">[];
  connections: Doc<"cardConnections">[];
  boardId: Id<"boards">;
  onCardPositionChange: (cardId: Id<"cards">, x: number, y: number) => void;
}

export const MindMapCanvas = ({ 
  cards, 
  connections, 
  boardId,
  onCardPositionChange 
}: MindMapCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Pan and zoom state
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panMode, setPanMode] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  
  // Connection state
  const { isConnecting, sourceCardId, cancelConnection, endConnection } = useConnectionStore();
  const { mutate: createConnection } = useCreateConnection();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Get all boards for linked board names
  const allBoards = useQuery(api.boards.listAll);
  
  // Create a map of board IDs to names
  const boardNameMap = new Map<string, string>();
  allBoards?.forEach(board => {
    boardNameMap.set(board._id, board.name);
  });

  // Handle wheel zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate zoom
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(scale * delta, 0.1), 3);

    // Adjust offset to zoom towards mouse position
    const scaleChange = newScale / scale;
    const newOffsetX = mouseX - (mouseX - offset.x) * scaleChange;
    const newOffsetY = mouseY - (mouseY - offset.y) * scaleChange;

    setScale(newScale);
    setOffset({ x: newOffsetX, y: newOffsetY });
  }, [scale, offset]);

  // Add wheel listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Handle pan start
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start panning if clicking on empty canvas or in pan mode
    if (e.target === canvasRef.current || panMode) {
      if (e.button === 0 || e.button === 1) { // Left click or middle click
        setIsPanning(true);
        setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
      }
    }

    // Cancel connection if clicking on empty space
    if (isConnecting && e.target === canvasRef.current) {
      cancelConnection();
      toast.info("Connection cancelled");
    }
  };

  // Handle pan move
  const handleMouseMove = (e: React.MouseEvent) => {
    // Update mouse position for pending connection
    if (isConnecting && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      // Convert screen coordinates to canvas coordinates
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      // Convert to canvas space by removing offset and scale
      setMousePosition({
        x: (screenX - offset.x) / scale,
        y: (screenY - offset.y) / scale
      });
    }

    if (isPanning) {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  };

  // Handle pan end
  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Handle card click for connections
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!isConnecting || !sourceCardId) return;

    // Check if clicked on a card
    const target = e.target as HTMLElement;
    const cardElement = target.closest('[data-card-id]');
    
    if (cardElement) {
      const targetCardId = cardElement.getAttribute('data-card-id') as Id<"cards">;
      
      if (targetCardId && targetCardId !== sourceCardId) {
        createConnection({
          boardId,
          fromCardId: sourceCardId,
          toCardId: targetCardId,
        }, {
          onSuccess: () => {
            toast.success("Connection created");
            endConnection();
          },
          onError: (error) => {
            const message = error.message?.includes("already exists") 
              ? "These cards are already connected" 
              : "Failed to create connection";
            toast.error(message);
            endConnection();
          }
        });
      }
    }
  };

  // Zoom controls
  const zoomIn = () => setScale(s => Math.min(s * 1.2, 3));
  const zoomOut = () => setScale(s => Math.max(s * 0.8, 0.1));
  const resetView = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };
  const fitToContent = () => {
    if (cards.length === 0) return;

    const container = containerRef.current;
    if (!container) return;

    // Find bounds of all cards
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    cards.forEach(card => {
      const x = card.positionX || 100;
      const y = card.positionY || 100;
      const w = card.width || 300;
      const h = card.height || 200;
      
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    });

    const contentWidth = maxX - minX + 100;
    const contentHeight = maxY - minY + 100;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const scaleX = containerWidth / contentWidth;
    const scaleY = containerHeight / contentHeight;
    const newScale = Math.min(scaleX, scaleY, 1) * 0.9;

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setScale(newScale);
    setOffset({
      x: containerWidth / 2 - centerX * newScale,
      y: containerHeight / 2 - centerY * newScale
    });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isConnecting) {
        cancelConnection();
        toast.info("Connection cancelled");
      }
      if (e.key === ' ') {
        e.preventDefault();
        setPanMode(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        setPanMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isConnecting, cancelConnection]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#1a1a1a]">
      {/* Zoom controls */}
      <div className="absolute top-4 left-4 z-50 flex flex-col gap-1 bg-[#2a2a2a] rounded-lg p-1 border border-[#3a3a3a] shadow-lg">
        <button
          onClick={zoomIn}
          className="p-2 hover:bg-[#3a3a3a] rounded transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="w-4 h-4 text-gray-300" />
        </button>
        <button
          onClick={zoomOut}
          className="p-2 hover:bg-[#3a3a3a] rounded transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="w-4 h-4 text-gray-300" />
        </button>
        <div className="h-px bg-[#3a3a3a] mx-1" />
        <button
          onClick={fitToContent}
          className="p-2 hover:bg-[#3a3a3a] rounded transition-colors"
          title="Fit to content"
        >
          <Maximize2 className="w-4 h-4 text-gray-300" />
        </button>
        <button
          onClick={resetView}
          className="p-2 hover:bg-[#3a3a3a] rounded transition-colors"
          title="Reset view"
        >
          <RotateCcw className="w-4 h-4 text-gray-300" />
        </button>
        <div className="h-px bg-[#3a3a3a] mx-1" />
        <button
          onClick={() => setPanMode(!panMode)}
          className={cn(
            "p-2 rounded transition-colors",
            panMode ? "bg-blue-500/30" : "hover:bg-[#3a3a3a]"
          )}
          title="Pan mode (hold Space)"
        >
          {panMode ? (
            <Hand className="w-4 h-4 text-blue-400" />
          ) : (
            <MousePointer className="w-4 h-4 text-gray-300" />
          )}
        </button>
      </div>

      {/* Scale indicator */}
      <div className="absolute bottom-4 left-4 z-50 px-3 py-1 bg-[#2a2a2a] rounded border border-[#3a3a3a] text-gray-400 text-sm">
        {Math.round(scale * 100)}%
      </div>

      {/* Connection mode indicator */}
      {isConnecting && (
        <div className="absolute top-4 right-4 z-50 px-4 py-2 bg-yellow-500/20 border border-yellow-500 rounded-lg text-yellow-400 text-sm flex items-center gap-2">
          <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
          Click a card to connect (Esc to cancel)
        </div>
      )}

      {/* Canvas container */}
      <div
        ref={containerRef}
        className={cn(
          "w-full h-full relative overflow-hidden",
          panMode || isPanning ? "cursor-grab" : "cursor-default",
          isPanning && "cursor-grabbing"
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
      >
        {/* Infinite grid pattern background */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, #2a2a2a 1px, transparent 1px),
              linear-gradient(to bottom, #2a2a2a 1px, transparent 1px)
            `,
            backgroundSize: `${50 * scale}px ${50 * scale}px`,
            backgroundPosition: `${offset.x}px ${offset.y}px`
          }}
        />

        {/* Transformed canvas */}
        <div
          ref={canvasRef}
          className="relative origin-top-left"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          }}
        >
          {/* Connections layer */}
          <ConnectionsLayer
            connections={connections}
            cards={cards}
            scale={scale}
            pendingConnection={isConnecting && sourceCardId ? {
              sourceCardId,
              mouseX: mousePosition.x,
              mouseY: mousePosition.y
            } : null}
          />

          {/* Cards */}
          {cards.map((card) => (
            <MindMapCard
              key={card._id}
              card={card}
              boardId={boardId}
              onPositionChange={onCardPositionChange}
              scale={scale}
              linkedBoardName={card.linkedBoardId ? boardNameMap.get(card.linkedBoardId) : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
