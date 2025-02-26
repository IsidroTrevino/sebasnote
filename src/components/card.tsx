import { useState, useRef } from "react";
import { Doc } from "../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Loader } from "lucide-react";

interface CardProps {
  card: Doc<"cards">;
}

export const Card = ({ card }: CardProps) => {
  const [width, setWidth] = useState(card.width || 300);
  const [height, setHeight] = useState(card.height || 200);
  const [isResizing, setIsResizing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const startResizeRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const updateCard = useMutation(api.cards.update);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    
    if (cardRef.current) {
      startResizeRef.current = {
        x: e.clientX,
        y: e.clientY,
        width,
        height
      };
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing || !startResizeRef.current) return;
    
    const deltaX = e.clientX - startResizeRef.current.x;
    const deltaY = e.clientY - startResizeRef.current.y;
    
    const newWidth = Math.max(200, startResizeRef.current.width + deltaX);
    const newHeight = Math.max(150, startResizeRef.current.height + deltaY);
    
    setWidth(newWidth);
    setHeight(newHeight);
  };

  const handleMouseUp = async () => {
    if (!isResizing) return;
    
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    setIsResizing(false);
    
    // Save the new dimensions to the database
    try {
      setIsSaving(true);
      await updateCard({
        id: card._id,
        width,
        height
      });
    } catch (error) {
      console.error("Failed to update card dimensions:", error);
      // Revert to original dimensions if update fails
      setWidth(card.width || 300);
      setHeight(card.height || 200);
    } finally {
      setIsSaving(false);
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
    >
      <div className="p-4 overflow-auto h-full">
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
        `}</style>
        <div 
          className={cn("card-content text-gray-300")}
          dangerouslySetInnerHTML={{ __html: card.content as string }}
        />
      </div>
      
      {/* Resize handle */}
      <div 
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize bg-[#3a3a3a] hover:bg-[#4a4a4a] transition-colors"
        onMouseDown={handleMouseDown}
      />
      
      {/* Loading indicator when saving */}
      {isSaving && (
        <div className="absolute top-2 right-2">
          <Loader className="h-4 w-4 animate-spin text-gray-400" />
        </div>
      )}
    </div>
  );
};