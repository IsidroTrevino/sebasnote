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
  // Dragging state for curve control points
  const [draggingCurve, setDraggingCurve] = useState<{
    connectionId: Id<"cardConnections">;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  // Dragging state for connection endpoints (start or end)
  const [draggingEndpoint, setDraggingEndpoint] = useState<{
    connectionId: Id<"cardConnections">;
    which: 'start' | 'end';
    cardId: Id<"cards">;
    x: number;
    y: number;
  } | null>(null);
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

  // Calculate intersection with card edges and apply offset along the edge (clamped)
  const getEdgePoint = (center: { x: number; y: number }, halfWidth: number, halfHeight: number, angleToTarget: number, isFrom: boolean, edgeOffset: number) => {
    const effectiveAngle = isFrom ? angleToTarget : angleToTarget + Math.PI;
    const cos = Math.cos(effectiveAngle);
    const sin = Math.sin(effectiveAngle);
    
    // Check which edge the line intersects
    const tanAngle = Math.abs(sin / cos);
    const cardRatio = halfHeight / halfWidth;
    
    let edgeX, edgeY;
    
    if (tanAngle < cardRatio) {
      // Intersects left or right edge - apply offset vertically along the edge
      edgeX = center.x + (cos > 0 ? halfWidth : -halfWidth);
      const baseY = center.y + (cos > 0 ? halfWidth : -halfWidth) * (sin / cos);
      const minY = center.y - halfHeight + 8;
      const maxY = center.y + halfHeight - 8;
      edgeY = Math.max(minY, Math.min(maxY, baseY + edgeOffset));
    } else {
      // Intersects top or bottom edge - apply offset horizontally along the edge
      edgeY = center.y + (sin > 0 ? halfHeight : -halfHeight);
      const baseX = center.x + (sin > 0 ? halfHeight : -halfHeight) * (cos / sin);
      const minX = center.x - halfWidth + 8;
      const maxX = center.x + halfWidth - 8;
      edgeX = Math.max(minX, Math.min(maxX, baseX + edgeOffset));
    }
    
    return { x: edgeX, y: edgeY };
  };

  // Get best connection points between two cards with separate source/destination offsets
  const getConnectionPoints = (fromCardId: Id<"cards">, toCardId: Id<"cards">, fromOffset: number = 0, toOffset: number = 0) => {
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

    const angle = Math.atan2(toCenter.y - fromCenter.y, toCenter.x - fromCenter.x);
    
    const fromHalfWidth = (fromCard.width || 300) / 2;
    const fromHalfHeight = (fromCard.height || 200) / 2;
    const toHalfWidth = (toCard.width || 300) / 2;
    const toHalfHeight = (toCard.height || 200) / 2;

    const fromPoint = getEdgePoint(fromCenter, fromHalfWidth, fromHalfHeight, angle, true, fromOffset);
    const toPoint = getEdgePoint(toCenter, toHalfWidth, toHalfHeight, angle, false, toOffset);

    return { from: fromPoint, to: toPoint };
  };

  // Create arrow path with curve and offset for multiple connections
  // customOffsetX/Y are user-dragged offsets added to the control point
  const createArrowPath = (from: { x: number; y: number }, to: { x: number; y: number }, offset: number = 0, customOffsetX: number = 0, customOffsetY: number = 0) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Control point for curve
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    
    // Add slight curve with offset for multiple connections
    const baseCurvature = Math.min(distance * 0.1, 30);
    const curvature = baseCurvature + offset;
    const perpX = distance > 0 ? -dy / distance * curvature : 0;
    const perpY = distance > 0 ? dx / distance * curvature : 0;
    
    const controlX = midX + perpX + customOffsetX;
    const controlY = midY + perpY + customOffsetY;

    return `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`;
  };

  // Create arrowhead based on curve tangent direction at arrival
  const createArrowhead = (from: { x: number; y: number }, to: { x: number; y: number }, curveOff: number = 0, custOffX: number = 0, custOffY: number = 0) => {
    // Compute the control point to get the tangent at t=1
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    const baseCurvature = Math.min(distance * 0.1, 30);
    const curvature = baseCurvature + curveOff;
    const perpX = distance > 0 ? -dy / distance * curvature : 0;
    const perpY = distance > 0 ? dx / distance * curvature : 0;
    const controlX = midX + perpX + custOffX;
    const controlY = midY + perpY + custOffY;

    // Tangent at t=1 of quadratic bezier: direction = P2 - P1 (control to end)
    const tangentX = to.x - controlX;
    const tangentY = to.y - controlY;
    const angle = Math.atan2(tangentY, tangentX);

    const arrowLength = 12;
    const arrowAngle = Math.PI / 6;
    
    const x1 = to.x - arrowLength * Math.cos(angle - arrowAngle);
    const y1 = to.y - arrowLength * Math.sin(angle - arrowAngle);
    const x2 = to.x - arrowLength * Math.cos(angle + arrowAngle);
    const y2 = to.y - arrowLength * Math.sin(angle + arrowAngle);
    
    return { x1, y1, x2, y2 };
  };

  // Get the center point on the curved path (quadratic bezier at t=0.5) with offset
  const getCurveCenter = (from: { x: number; y: number }, to: { x: number; y: number }, offset: number = 0, customOffsetX: number = 0, customOffsetY: number = 0) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return { x: from.x, y: from.y };
    
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    
    const baseCurvature = Math.min(distance * 0.1, 30);
    const curvature = baseCurvature + offset;
    const perpX = -dy / distance * curvature;
    const perpY = dx / distance * curvature;
    
    const controlX = midX + perpX + customOffsetX;
    const controlY = midY + perpY + customOffsetY;
    
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

  // Close selection/color picker when clicking outside
  useEffect(() => {
    if (!selectedConnection) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | SVGElement | null;
      if (!target) return;
      // Check if click is inside a connection popup or on a connection element
      const inPopup = 'closest' in target && target.closest('.connection-color-picker, .connection-menu');
      if (!inPopup) {
        setShowColorPicker(null);
        setSelectedConnection(null);
        setHoveredConnection(null);
      }
    };
    // Use setTimeout so the click that selected the connection doesn't immediately close it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedConnection]);

  // Convert screen coordinates to SVG canvas coordinates,
  // accounting for CSS transforms (scale/translate) on the parent.
  const screenToSVG = (e: MouseEvent): { x: number; y: number } | null => {
    const svg = document.querySelector('.connections-svg') as SVGSVGElement | null;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const pt = new DOMPoint(e.clientX, e.clientY);
    const svgPt = pt.matrixTransform(ctm.inverse());
    return { x: svgPt.x, y: svgPt.y };
  };

  // Handle curve dragging
  useEffect(() => {
    if (!draggingCurve) return;

    const handleMouseMove = (e: MouseEvent) => {
      const svgPoint = screenToSVG(e);
      if (!svgPoint) return;
      const mouseX = svgPoint.x;
      const mouseY = svgPoint.y;

      // Find the connection to compute the base control point
      const conn = connections.find(c => c._id === draggingCurve.connectionId);
      if (!conn) return;

      const fromEndpointOffset = getEndpointOffset(conn._id, conn.fromCardId);
      const toEndpointOffset = getEndpointOffset(conn._id, conn.toCardId);
      const points = getConnectionPoints(conn.fromCardId, conn.toCardId, fromEndpointOffset, toEndpointOffset);
      if (!points) return;

      const samePairOffset = getConnectionOffset(conn._id, conn.fromCardId, conn.toCardId);
      const autoOffset = samePairOffset + (fromEndpointOffset + toEndpointOffset) / 2;

      // Calculate base control point (without custom offset)
      const dx = points.to.x - points.from.x;
      const dy = points.to.y - points.from.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const midX = (points.from.x + points.to.x) / 2;
      const midY = (points.from.y + points.to.y) / 2;
      const baseCurvature = Math.min(distance * 0.1, 30);
      const curvature = baseCurvature + autoOffset;
      const perpX = distance > 0 ? -dy / distance * curvature : 0;
      const perpY = distance > 0 ? dx / distance * curvature : 0;
      const baseControlX = midX + perpX;
      const baseControlY = midY + perpY;

      // The user drags the visual curve center (bezier t=0.5), not the control point.
      // Bezier at t=0.5: center = 0.25*from + 0.5*control + 0.25*to
      // So: control = 2*center - 0.5*from - 0.5*to
      // We want center = mousePosition, so:
      const desiredControlX = 2 * mouseX - 0.5 * points.from.x - 0.5 * points.to.x;
      const desiredControlY = 2 * mouseY - 0.5 * points.from.y - 0.5 * points.to.y;

      // Custom offset = desired control point - base control point
      setDraggingCurve({
        connectionId: draggingCurve.connectionId,
        offsetX: desiredControlX - baseControlX,
        offsetY: desiredControlY - baseControlY,
      });
    };

    const handleMouseUp = () => {
      // Persist the custom offset
      updateConnection({
        id: draggingCurve.connectionId,
        curveOffsetX: draggingCurve.offsetX,
        curveOffsetY: draggingCurve.offsetY,
      });
      setDraggingCurve(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggingCurve, connections]);

  // Snap a point to the nearest edge of a card, returning the closest point on the card perimeter
  const snapToCardEdge = (mouseX: number, mouseY: number, cardId: Id<"cards">) => {
    const card = cards.find(c => c._id === cardId);
    if (!card) return { x: mouseX, y: mouseY };

    const left = card.positionX || 100;
    const top = card.positionY || 100;
    const w = card.width || 300;
    const h = card.height || 200;
    const right = left + w;
    const bottom = top + h;

    // Clamp to card bounds first
    const cx = Math.max(left, Math.min(right, mouseX));
    const cy = Math.max(top, Math.min(bottom, mouseY));

    // Find nearest edge
    const distLeft = Math.abs(cx - left);
    const distRight = Math.abs(cx - right);
    const distTop = Math.abs(cy - top);
    const distBottom = Math.abs(cy - bottom);

    const minDist = Math.min(distLeft, distRight, distTop, distBottom);

    if (minDist === distLeft) return { x: left, y: Math.max(top + 8, Math.min(bottom - 8, mouseY)) };
    if (minDist === distRight) return { x: right, y: Math.max(top + 8, Math.min(bottom - 8, mouseY)) };
    if (minDist === distTop) return { x: Math.max(left + 8, Math.min(right - 8, mouseX)), y: top };
    return { x: Math.max(left + 8, Math.min(right - 8, mouseX)), y: bottom };
  };

  // Handle endpoint dragging
  useEffect(() => {
    if (!draggingEndpoint) return;

    const handleMouseMove = (e: MouseEvent) => {
      const svgPoint = screenToSVG(e);
      if (!svgPoint) return;
      const mouseX = svgPoint.x;
      const mouseY = svgPoint.y;

      const snapped = snapToCardEdge(mouseX, mouseY, draggingEndpoint.cardId);
      setDraggingEndpoint(prev => prev ? { ...prev, x: snapped.x, y: snapped.y } : null);
    };

    const handleMouseUp = () => {
      // Compute offset relative to auto-computed endpoint
      const conn = connections.find(c => c._id === draggingEndpoint.connectionId);
      if (conn) {
        const fromEndpointOffset = getEndpointOffset(conn._id, conn.fromCardId);
        const toEndpointOffset = getEndpointOffset(conn._id, conn.toCardId);
        const autoPoints = getConnectionPoints(conn.fromCardId, conn.toCardId, fromEndpointOffset, toEndpointOffset);
        if (autoPoints) {
          const autoPoint = draggingEndpoint.which === 'start' ? autoPoints.from : autoPoints.to;
          const offsetX = draggingEndpoint.x - autoPoint.x;
          const offsetY = draggingEndpoint.y - autoPoint.y;
          
          if (draggingEndpoint.which === 'start') {
            updateConnection({ id: draggingEndpoint.connectionId, startOffsetX: offsetX, startOffsetY: offsetY });
          } else {
            updateConnection({ id: draggingEndpoint.connectionId, endOffsetX: offsetX, endOffsetY: offsetY });
          }
        }
      }
      setDraggingEndpoint(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggingEndpoint, connections]);

  // Group connections by card pairs and assign offsets
  // Curve offset: only for connections between the same card pair (fans them out)
  const getConnectionOffset = (connectionId: Id<"cardConnections">, fromCardId: Id<"cards">, toCardId: Id<"cards">) => {
    const sameDirectionConnections = connections.filter(c => 
      c.fromCardId === fromCardId && c.toCardId === toCardId
    );
    
    const index = sameDirectionConnections.findIndex(c => c._id === connectionId);
    const total = sameDirectionConnections.length;
    
    if (total === 1) return 0;
    
    const spacing = 25;
    const offset = (index - (total - 1) / 2) * spacing;
    
    return offset;
  };

  // Determine which edge of a card a connection arrives at / departs from
  const getEdgeForAngle = (halfWidth: number, halfHeight: number, angleToTarget: number, isFrom: boolean) => {
    const effectiveAngle = isFrom ? angleToTarget : angleToTarget + Math.PI;
    const cos = Math.cos(effectiveAngle);
    const sin = Math.sin(effectiveAngle);
    const tanAngle = Math.abs(sin / cos);
    const cardRatio = halfHeight / halfWidth;
    
    if (tanAngle < cardRatio) {
      return cos > 0 ? 'right' : 'left';
    } else {
      return sin > 0 ? 'bottom' : 'top';
    }
  };

  // Endpoint offset: considers ALL connections touching the same card on the same edge (both incoming and outgoing)
  const getEndpointOffset = (connectionId: Id<"cardConnections">, cardId: Id<"cards">) => {
    const card = cards.find(c => c._id === cardId);
    if (!card) return 0;

    const halfWidth = (card.width || 300) / 2;
    const halfHeight = (card.height || 200) / 2;
    const cardCenter = {
      x: (card.positionX || 100) + halfWidth,
      y: (card.positionY || 100) + halfHeight,
    };

    // Determine which edge a connection uses on this card
    const getEdgeForConnection = (c: typeof connections[0]) => {
      // Find the OTHER card in this connection
      const isTo = c.toCardId === cardId;
      const isFrom = c.fromCardId === cardId;
      if (!isTo && !isFrom) return null;
      
      const otherId = isTo ? c.fromCardId : c.toCardId;
      const otherCard = cards.find(oc => oc._id === otherId);
      if (!otherCard) return null;

      const otherCenter = {
        x: (otherCard.positionX || 100) + (otherCard.width || 300) / 2,
        y: (otherCard.positionY || 100) + (otherCard.height || 200) / 2,
      };

      // The edge on our card facing the other card
      const angle = Math.atan2(otherCenter.y - cardCenter.y, otherCenter.x - cardCenter.x);
      return getEdgeForAngle(halfWidth, halfHeight, angle, true);
    };

    // Get edge for current connection
    const currentConn = connections.find(c => c._id === connectionId);
    if (!currentConn) return 0;
    const currentEdge = getEdgeForConnection(currentConn);
    if (!currentEdge) return 0;

    // Filter ALL connections touching this card on the same edge (both incoming AND outgoing)
    const connectionsOnEdge = connections.filter(c => {
      const touchesCard = c.toCardId === cardId || c.fromCardId === cardId;
      if (!touchesCard) return false;
      return getEdgeForConnection(c) === currentEdge;
    });

    const total = connectionsOnEdge.length;
    if (total <= 1) return 0;

    const index = connectionsOnEdge.findIndex(c => c._id === connectionId);
    const spacing = 20;
    return (index - (total - 1) / 2) * spacing;
  };

  return (
    <svg 
      className="absolute pointer-events-none overflow-visible connections-svg"
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

      {/* Render connections - selected/hovered connection rendered last so its popup is on top */}
      {[...connections].sort((a, b) => {
        const aSelected = a._id === selectedConnection ? 2 : a._id === hoveredConnection ? 1 : 0;
        const bSelected = b._id === selectedConnection ? 2 : b._id === hoveredConnection ? 1 : 0;
        return aSelected - bSelected;
      }).map((connection) => {
        const fromCard = cards.find(c => c._id === connection.fromCardId);
        const toCard = cards.find(c => c._id === connection.toCardId);
        
        if (!fromCard || !toCard) return null;

        const samePairOffset = getConnectionOffset(connection._id, connection.fromCardId, connection.toCardId);
        const fromEndpointOffset = getEndpointOffset(connection._id, connection.fromCardId);
        const toEndpointOffset = getEndpointOffset(connection._id, connection.toCardId);
        // Combine: same-pair curve offset + average endpoint offset to ensure curves fan apart
        const curveOffset = samePairOffset + (fromEndpointOffset + toEndpointOffset) / 2;
        const autoPoints = getConnectionPoints(connection.fromCardId, connection.toCardId, fromEndpointOffset, toEndpointOffset);
        if (!autoPoints) return null;

        // Apply custom endpoint offsets (from user dragging or persisted)
        const isDraggingStart = draggingEndpoint?.connectionId === connection._id && draggingEndpoint.which === 'start';
        const isDraggingEnd = draggingEndpoint?.connectionId === connection._id && draggingEndpoint.which === 'end';

        const points = {
          from: isDraggingStart
            ? { x: draggingEndpoint.x, y: draggingEndpoint.y }
            : {
                x: autoPoints.from.x + (connection.startOffsetX ?? 0),
                y: autoPoints.from.y + (connection.startOffsetY ?? 0),
              },
          to: isDraggingEnd
            ? { x: draggingEndpoint.x, y: draggingEndpoint.y }
            : {
                x: autoPoints.to.x + (connection.endOffsetX ?? 0),
                y: autoPoints.to.y + (connection.endOffsetY ?? 0),
              },
        };

        // Custom curve offset from user dragging or persisted value
        const isDragging = draggingCurve?.connectionId === connection._id;
        const customOffsetX = isDragging ? draggingCurve.offsetX : (connection.curveOffsetX ?? 0);
        const customOffsetY = isDragging ? draggingCurve.offsetY : (connection.curveOffsetY ?? 0);

        const isHovered = hoveredConnection === connection._id;
        const isSelected = selectedConnection === connection._id;
        const showButton = isHovered || isSelected;
        const color = previewColors[connection._id as string] ?? connection.color ?? "#6b7280";
        const curveCenter = getCurveCenter(points.from, points.to, curveOffset, customOffsetX, customOffsetY);

        // Use card positions in key to force re-render when positions change
        const positionKey = `${connection._id}-${fromCard.positionX}-${fromCard.positionY}-${toCard.positionX}-${toCard.positionY}`;

        return (
          <g 
            key={positionKey}
            onMouseEnter={() => {
              // Don't change hover if another connection is already selected
              if (!selectedConnection) {
                setHoveredConnection(connection._id);
              }
            }}
            onMouseLeave={(e) => {
                if (selectedConnection) return; // Don't close anything while a connection is selected

                const me = e as React.MouseEvent;
                const el = document.elementFromPoint(me.clientX, me.clientY) as HTMLElement | null;
                const overPopup = el && el.closest && el.closest('.connection-color-picker');

                if (!overPopup) {
                  setHoveredConnection(null);
                }
              }}
          >
            {/* Invisible wider path for easier hover - disabled while dragging */}
            <path
              d={createArrowPath(points.from, points.to, curveOffset, customOffsetX, customOffsetY)}
              stroke="transparent"
              strokeWidth={20}
              fill="none"
              style={{ pointerEvents: (draggingCurve || draggingEndpoint) ? 'none' : 'stroke' }}
            />
            
            {/* Invisible circle at center for button hover area */}
            <circle
              cx={curveCenter.x}
              cy={curveCenter.y}
              r={20}
              fill="transparent"
              style={{ pointerEvents: (draggingCurve || draggingEndpoint) ? 'none' : 'fill' }}
            />
            
            {/* Visible path */}
            <path
              d={createArrowPath(points.from, points.to, curveOffset, customOffsetX, customOffsetY)}
              stroke={color}
              strokeWidth={isHovered ? 3 : 2}
              fill="none"
              className="pointer-events-none"
              style={{ transition: 'none' }}
            />

            {/* Arrowhead - follows curve tangent direction */}
            {(() => {
              const head = createArrowhead(points.from, points.to, curveOffset, customOffsetX, customOffsetY);
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
            {showButton && !draggingCurve && !draggingEndpoint && (
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
                  className="bg-[#1e1e1e] border border-[#3a3a3a] rounded-lg shadow-2xl overflow-visible connection-menu"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
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

            {/* Draggable curve handle - placed at the visual center of the curve */}
            {(isSelected || isDragging) && (
              <circle
                cx={curveCenter.x}
                cy={curveCenter.y}
                r={isDragging ? 7 : 6}
                fill={color}
                stroke="white"
                strokeWidth={isDragging ? 2.5 : 2}
                opacity={isDragging ? 0.9 : 0.7}
                style={{ 
                  cursor: isDragging ? 'grabbing' : 'grab', 
                  pointerEvents: isDragging ? 'none' : 'fill' 
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setDraggingCurve({
                    connectionId: connection._id,
                    offsetX: customOffsetX,
                    offsetY: customOffsetY,
                  });
                }}
              />
            )}

            {/* Draggable start endpoint handle */}
            {(isSelected || isDraggingStart) && (
              <circle
                cx={points.from.x}
                cy={points.from.y}
                r={isDraggingStart ? 7 : 5}
                fill="white"
                stroke={color}
                strokeWidth={2}
                opacity={isDraggingStart ? 0.95 : 0.8}
                style={{ 
                  cursor: isDraggingStart ? 'grabbing' : 'grab',
                  pointerEvents: isDraggingStart ? 'none' : 'fill'
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setDraggingEndpoint({
                    connectionId: connection._id,
                    which: 'start',
                    cardId: connection.fromCardId,
                    x: points.from.x,
                    y: points.from.y,
                  });
                }}
              />
            )}

            {/* Draggable end endpoint handle */}
            {(isSelected || isDraggingEnd) && (
              <circle
                cx={points.to.x}
                cy={points.to.y}
                r={isDraggingEnd ? 7 : 5}
                fill="white"
                stroke={color}
                strokeWidth={2}
                opacity={isDraggingEnd ? 0.95 : 0.8}
                style={{ 
                  cursor: isDraggingEnd ? 'grabbing' : 'grab',
                  pointerEvents: isDraggingEnd ? 'none' : 'fill'
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setDraggingEndpoint({
                    connectionId: connection._id,
                    which: 'end',
                    cardId: connection.toCardId,
                    x: points.to.x,
                    y: points.to.y,
                  });
                }}
              />
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
