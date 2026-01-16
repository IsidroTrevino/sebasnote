'use client';

import { Doc, Id } from "../../convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Trash2, Palette } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { HudColorPicker } from "./hudColorPicker";

// Predefined colors for connection arrows
const CONNECTION_COLOR_PRESETS = [
  { name: "Gray", value: "#6b7280" },
  { name: "Slate", value: "#64748b" },
  { name: "Zinc", value: "#71717a" },
  { name: "Red", value: "#ef4444" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Yellow", value: "#eab308" },
  { name: "Lime", value: "#84cc16" },
  { name: "Green", value: "#22c55e" },
  { name: "Emerald", value: "#10b981" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Sky", value: "#0ea5e9" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Purple", value: "#a855f7" },
  { name: "Fuchsia", value: "#d946ef" },
  { name: "Pink", value: "#ec4899" },
  { name: "White", value: "#ffffff" },
];

interface ConnectionsLayerProps {
  connections: Doc<"cardConnections">[];
  cards: Doc<"cards">[];
  // scale is unused in this component but kept for backwards compatibility
  scale?: number;
  pendingConnection?: {
    sourceCardId: Id<"cards">;
    mouseX: number;
    mouseY: number;
  } | null;
}

export const ConnectionsLayer = ({ 
  connections, 
  cards, 
  pendingConnection 
}: ConnectionsLayerProps) => {
  const [hoveredConnection, setHoveredConnection] = useState<Id<"cardConnections"> | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<Id<"cardConnections"> | null>(null);
  const [showColorPicker, setShowColorPicker] = useState<Id<"cardConnections"> | null>(null);
  const [previewColors, setPreviewColors] = useState<Record<string, string>>({});
  const deleteConnection = useMutation(api.cards.deleteConnection);
  const updateConnection = useMutation(api.cards.updateConnection);

  // Get card center position
  const getCardCenter = (cardId: Id<"cards">) => {
    const card = cards.find(c => c._id === cardId);
    if (!card) return null;
    
    return {
      x: (card.positionX || 100) + (card.width || 300) / 2,
      y: (card.positionY || 100) + (card.height || 200) / 2
    };
  };

  // Get best connection points between two cards
  const getConnectionPoints = (fromCardId: Id<"cards">, toCardId: Id<"cards">) => {
    const fromCard = cards.find(c => c._id === fromCardId);
    const toCard = cards.find(c => c._id === toCardId);
    
    if (!fromCard || !toCard) return null;

    const fromCenter = {
      x: (fromCard.positionX || 100) + (fromCard.width || 300) / 2,
      y: (fromCard.positionY || 100) + (fromCard.height || 200) / 2
    };
    
    const toCenter = {
      x: (toCard.positionX || 100) + (toCard.width || 300) / 2,
      y: (toCard.positionY || 100) + (toCard.height || 200) / 2
    };

    // Calculate angle between centers
    const angle = Math.atan2(toCenter.y - fromCenter.y, toCenter.x - fromCenter.x);
    
    // Get edge points based on angle
    const fromHalfWidth = (fromCard.width || 300) / 2;
    const fromHalfHeight = (fromCard.height || 200) / 2;
    const toHalfWidth = (toCard.width || 300) / 2;
    const toHalfHeight = (toCard.height || 200) / 2;

    // Calculate intersection with card edges
    const getEdgePoint = (center: { x: number; y: number }, halfWidth: number, halfHeight: number, angleToTarget: number, isFrom: boolean) => {
      const effectiveAngle = isFrom ? angleToTarget : angleToTarget + Math.PI;
      const cos = Math.cos(effectiveAngle);
      const sin = Math.sin(effectiveAngle);
      
      // Check which edge the line intersects
      const tanAngle = Math.abs(sin / cos);
      const cardRatio = halfHeight / halfWidth;
      
      let edgeX, edgeY;
      
      if (tanAngle < cardRatio) {
        // Intersects left or right edge
        edgeX = center.x + (cos > 0 ? halfWidth : -halfWidth);
        edgeY = center.y + (cos > 0 ? halfWidth : -halfWidth) * (sin / cos);
      } else {
        // Intersects top or bottom edge
        edgeY = center.y + (sin > 0 ? halfHeight : -halfHeight);
        edgeX = center.x + (sin > 0 ? halfHeight : -halfHeight) * (cos / sin);
      }
      
      return { x: edgeX, y: edgeY };
    };

    const fromPoint = getEdgePoint(fromCenter, fromHalfWidth, fromHalfHeight, angle, true);
    const toPoint = getEdgePoint(toCenter, toHalfWidth, toHalfHeight, angle, false);

    return { from: fromPoint, to: toPoint };
  };

  // Create arrow path with curve
  const createArrowPath = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Control point for curve
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    
    // Add slight curve
    const curvature = Math.min(distance * 0.1, 30);
    const perpX = -dy / distance * curvature;
    const perpY = dx / distance * curvature;
    
    const controlX = midX + perpX;
    const controlY = midY + perpY;

    return `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`;
  };

  // Create arrowhead
  const createArrowhead = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const arrowLength = 12;
    const arrowAngle = Math.PI / 6;
    
    const x1 = to.x - arrowLength * Math.cos(angle - arrowAngle);
    const y1 = to.y - arrowLength * Math.sin(angle - arrowAngle);
    const x2 = to.x - arrowLength * Math.cos(angle + arrowAngle);
    const y2 = to.y - arrowLength * Math.sin(angle + arrowAngle);
    
    return { x1, y1, x2, y2 };
  };

  // Get the center point on the curved path (quadratic bezier at t=0.5)
  const getCurveCenter = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return { x: from.x, y: from.y };
    
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    
    const curvature = Math.min(distance * 0.1, 30);
    const perpX = -dy / distance * curvature;
    const perpY = dx / distance * curvature;
    
    const controlX = midX + perpX;
    const controlY = midY + perpY;
    
    // Quadratic bezier at t=0.5: B(0.5) = 0.25*P0 + 0.5*P1 + 0.25*P2
    const centerX = 0.25 * from.x + 0.5 * controlX + 0.25 * to.x;
    const centerY = 0.25 * from.y + 0.5 * controlY + 0.25 * to.y;
    
    return { x: centerX, y: centerY };
  };

  const handleDeleteConnection = async (connectionId: Id<"cardConnections">) => {
    try {
      await deleteConnection({ id: connectionId });
      toast.success("Connection deleted");
    } catch (error) {
      console.error("Failed to delete connection:", error);
      toast.error("Failed to delete connection");
    }
  };

  const handleColorChange = async (connectionId: Id<"cardConnections">, color: string) => {
      // Fire-and-forget update to avoid UI delay during dragging/quick picks
      updateConnection({ id: connectionId, color })
        .then(() => {
          // Clear preview so the server-authoritative color is used
          setPreviewColors((prev) => {
            const copy = { ...prev };
            delete copy[connectionId as string];
            return copy;
          });
        })
        .catch((error) => {
          console.error("Failed to update connection color:", error);
          toast.error("Failed to update color");
        });
  };

  // Close color picker when clicking outside of it
  useEffect(() => {
    if (!showColorPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // If the click isn't inside any color picker popup, close
      if (!target.closest('.connection-color-picker')) {
        setShowColorPicker(null);
        setSelectedConnection(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColorPicker]);

  return (
    <svg 
      className="absolute pointer-events-none overflow-visible"
      style={{ 
        zIndex: 5,
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        minWidth: '10000px',
        minHeight: '10000px'
      }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
        </marker>
      </defs>

      {/* Render connections */}
      {connections.map((connection) => {
        const fromCard = cards.find(c => c._id === connection.fromCardId);
        const toCard = cards.find(c => c._id === connection.toCardId);
        
        if (!fromCard || !toCard) return null;

        const points = getConnectionPoints(connection.fromCardId, connection.toCardId);
        if (!points) return null;

        const isHovered = hoveredConnection === connection._id;
        const isSelected = selectedConnection === connection._id;
        const showButton = isHovered || isSelected;
        const color = previewColors[connection._id as string] ?? connection.color ?? "#6b7280";
        const curveCenter = getCurveCenter(points.from, points.to);

        // Use card positions in key to force re-render when positions change
        const positionKey = `${connection._id}-${fromCard.positionX}-${fromCard.positionY}-${toCard.positionX}-${toCard.positionY}`;

        return (
          <g 
            key={positionKey}
            onMouseEnter={() => setHoveredConnection(connection._id)}
            onMouseLeave={(e) => {
                const me = e as React.MouseEvent;
                const el = document.elementFromPoint(me.clientX, me.clientY) as HTMLElement | null;
                const overPopup = el && el.closest && el.closest('.connection-color-picker');

                if (!isSelected) {
                  setHoveredConnection(null);
                }

                // If this connection is selected but the pointer moved outside both the connection and its popup, close it
                if (isSelected && !overPopup) {
                  setSelectedConnection(null);
                  setShowColorPicker(null);
                  setHoveredConnection(null);
                }
              }}
          >
            {/* Invisible wider path for easier hover */}
            <path
              d={createArrowPath(points.from, points.to)}
              stroke="transparent"
              strokeWidth={20}
              fill="none"
              style={{ pointerEvents: 'stroke' }}
            />
            
            {/* Invisible circle at center for button hover area */}
            <circle
              cx={curveCenter.x}
              cy={curveCenter.y}
              r={20}
              fill="transparent"
              style={{ pointerEvents: 'fill' }}
            />
            
            {/* Visible path */}
            <path
              d={createArrowPath(points.from, points.to)}
              stroke={color}
              strokeWidth={isHovered ? 3 : 2}
              fill="none"
              className="pointer-events-none"
              style={{ transition: 'none' }}
            />

            {/* Arrowhead (filled polygon for immediate color updates) */}
            {(() => {
              const head = createArrowhead(points.from, points.to);
              const pointsAttr = `${points.to.x},${points.to.y} ${head.x1},${head.y1} ${head.x2},${head.y2}`;
              return (
                <polygon
                  points={pointsAttr}
                  fill={color}
                  className="pointer-events-none"
                />
              );
            })()}

            {/* Connection label */}
            {connection.label && (
              <text
                x={(points.from.x + points.to.x) / 2}
                y={(points.from.y + points.to.y) / 2 - 10}
                textAnchor="middle"
                className="text-xs fill-gray-400 pointer-events-none"
              >
                {connection.label}
              </text>
            )}

            {/* Plus button on hover */}
            {showButton && (
              <g
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setSelectedConnection(isSelected ? null : connection._id);
                  if (isSelected) {
                    setShowColorPicker(null);
                  }
                }}
              >
                {/* Clickable circle background */}
                <circle
                  cx={curveCenter.x}
                  cy={curveCenter.y}
                  r={14}
                  fill="#3b82f6"
                  stroke="white"
                  strokeWidth={2}
                  style={{ pointerEvents: 'fill' }}
                />
                {/* Plus icon using SVG lines */}
                <line
                  x1={curveCenter.x - 5}
                  y1={curveCenter.y}
                  x2={curveCenter.x + 5}
                  y2={curveCenter.y}
                  stroke="white"
                  strokeWidth={2}
                  strokeLinecap="round"
                  className="pointer-events-none"
                />
                <line
                  x1={curveCenter.x}
                  y1={curveCenter.y - 5}
                  x2={curveCenter.x}
                  y2={curveCenter.y + 5}
                  stroke="white"
                  strokeWidth={2}
                  strokeLinecap="round"
                  className="pointer-events-none"
                />
              </g>
            )}

            {/* Tooltip menu */}
            {isSelected && (
              <foreignObject
                x={curveCenter.x - 140}
                y={curveCenter.y + 18}
                width={280}
                height={showColorPicker === connection._id ? 360 : 90}
                style={{ pointerEvents: 'all', overflow: 'visible' }}
              >
                <div 
                  className="bg-[#1e1e1e] border border-[#3a3a3a] rounded-lg shadow-2xl overflow-visible"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Change color option */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowColorPicker(showColorPicker === connection._id ? null : connection._id);
                    }}
                    className="w-full px-3 py-2 flex items-center gap-2 hover:bg-[#2a2a2a] transition-colors text-left"
                  >
                    <Palette className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-gray-200">Change color</span>
                    <div 
                      className="ml-auto w-4 h-4 rounded-full border border-[#4a4a4a]" 
                      style={{ backgroundColor: color }}
                    />
                  </button>
                  
                  {/* HUD Color picker */}
                  {showColorPicker === connection._id && (
                    <div className="p-2 border-t border-[#3a3a3a] connection-color-picker">
                      <HudColorPicker
                        color={color}
                        onPreview={(newColor) => {
                          setPreviewColors((prev) => ({ ...prev, [connection._id as string]: newColor }));
                        }}
                        onChange={(newColor) => {
                          // Persist color but keep the picker open
                          handleColorChange(connection._id, newColor);
                        }}
                        onClose={() => {
                          // clear preview when closing; the real color will come from server update
                          setPreviewColors((prev) => {
                            const copy = { ...prev };
                            delete copy[connection._id as string];
                            return copy;
                          });
                          setShowColorPicker(null);
                          setSelectedConnection(null);
                        }}
                        presetColors={CONNECTION_COLOR_PRESETS}
                      />
                    </div>
                  )}
                    
                  {/* Delete option */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteConnection(connection._id);
                      setSelectedConnection(null);
                    }}
                    className="w-full px-3 py-2 flex items-center gap-2 hover:bg-red-500/20 transition-colors text-left border-t border-[#3a3a3a]"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-red-400">Delete arrow</span>
                    </button>
                  </div>
                </foreignObject>
            )}
          </g>
        );
      })}

      {/* Pending connection line */}
      {pendingConnection && (() => {
        const fromCenter = getCardCenter(pendingConnection.sourceCardId);
        if (!fromCenter) return null;

        return (
          <line
            x1={fromCenter.x}
            y1={fromCenter.y}
            x2={pendingConnection.mouseX}
            y2={pendingConnection.mouseY}
            stroke="#60a5fa"
            strokeWidth={2}
            strokeDasharray="5,5"
            className="animate-pulse"
          />
        );
      })()}
    </svg>
  );
};
