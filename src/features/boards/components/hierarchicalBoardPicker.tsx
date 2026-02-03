'use client';

import { useState, useMemo, useCallback } from "react";
import { ChevronRight, Plus, Check, ArrowRight } from "lucide-react";
import { BoardType } from "@/features/types/boardType";
import { Id } from "../../../../convex/_generated/dataModel";

interface HierarchicalBoardPickerProps {
  boards: BoardType[];
  linkedBoardIds: Set<Id<"boards">>;
  excludeBoardId?: Id<"boards">;
  onAddBoard: (board: BoardType) => void;
}

export const HierarchicalBoardPicker = ({
  boards,
  linkedBoardIds,
  excludeBoardId,
  onAddBoard,
}: HierarchicalBoardPickerProps) => {
  const [expandedBoardIds, setExpandedBoardIds] = useState<Set<Id<"boards">>>(
    new Set()
  );
  const [justAddedBoardIds, setJustAddedBoardIds] = useState<Set<Id<"boards">>>(
    new Set()
  );
  const [hoveredBoardId, setHoveredBoardId] = useState<Id<"boards"> | null>(null);

  // Get root boards (no parent)
  const rootBoards = useMemo(
    () => boards.filter((b) => !b.parentId && b._id !== excludeBoardId),
    [boards, excludeBoardId]
  );

  // Create a map for quick children lookup
  const childrenMap = useMemo(() => {
    const map = new Map<Id<"boards">, BoardType[]>();
    boards.forEach((board) => {
      if (board.parentId && board._id !== excludeBoardId) {
        if (!map.has(board.parentId)) {
          map.set(board.parentId, []);
        }
        map.get(board.parentId)!.push(board);
      }
    });
    return map;
  }, [boards, excludeBoardId]);

  // Get board path for tooltip
  const getBoardPath = useCallback((boardId: Id<"boards">): string => {
    const board = boards.find((b) => b._id === boardId);
    if (!board) return "";

    const path: string[] = [board.name];
    let currentId: Id<"boards"> | undefined = board.parentId;

    while (currentId) {
      const parent = boards.find((b) => b._id === currentId);
      if (!parent) break;
      path.unshift(parent.name);
      currentId = parent.parentId;
    }

    return path.join(" / ");
  }, [boards]);

  const toggleExpanded = (boardId: Id<"boards">) => {
    setExpandedBoardIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(boardId)) {
        newSet.delete(boardId);
      } else {
        newSet.add(boardId);
      }
      return newSet;
    });
  };

  const handleAddBoard = useCallback((board: BoardType) => {
    onAddBoard(board);
    
    // Show success animation
    setJustAddedBoardIds((prev) => new Set(prev).add(board._id));

    // Remove the animation after 2 seconds
    setTimeout(() => {
      setJustAddedBoardIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(board._id);
        return newSet;
      });
    }, 2000);
  }, [onAddBoard]);

  const renderBoard = (board: BoardType, level: number = 0) => {
    const children = childrenMap.get(board._id) || [];
    const isExpanded = expandedBoardIds.has(board._id);
    const isLinked = linkedBoardIds.has(board._id);
    const isJustAdded = justAddedBoardIds.has(board._id);
    const hasChildren = children.length > 0;

    return (
      <div key={board._id}>
        <div
          className={`flex items-center gap-2 px-2 py-1.5 rounded transition-all duration-200 ${
            isJustAdded ? "bg-green-500/10" : "hover:bg-[#3a3a3a]"
          }`}
          style={{ marginLeft: `${level * 12}px` }}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(board._id);
              }}
              className={`flex items-center justify-center w-5 h-5 transition-transform duration-200 ${
                isExpanded ? "rotate-90" : ""
              }`}
            >
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          )}
          {!hasChildren && <div className="w-5" />}

          <span className="flex-1 text-sm text-gray-200">{board.name}</span>

          {!isLinked && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleAddBoard(board);
              }}
              disabled={isJustAdded}
              className={`w-6 h-6 flex items-center justify-center rounded transition-all duration-200 ${
                isJustAdded
                  ? "bg-green-500/30 text-green-400 cursor-default"
                  : "bg-[#3a3a3a] hover:bg-[#4a4a4a] text-gray-300"
              }`}
              title={isJustAdded ? "Board linked!" : `Add link to ${board.name}`}
            >
              {isJustAdded ? (
                <Check className="w-3 h-3 animate-pulse" />
              ) : (
                <Plus className="w-3 h-3" />
              )}
            </button>
          )}
          {isLinked && (
            <div className="w-6 h-6 flex items-center justify-center text-green-500 text-xs font-bold animate-in fade-in duration-300">
              ✓
            </div>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200">
            {children.map((child) => renderBoard(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {rootBoards.length === 0 ? (
        <div className="text-gray-500 text-sm px-3 py-2">No boards available</div>
      ) : (
        rootBoards.map((board) => renderBoard(board))
      )}
    </div>
  );
};
