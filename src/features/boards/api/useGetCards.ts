import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

export const useGetBoardCards = (boardId?: Id<"boards">) => {
  const cards = useQuery(
    api.cards.getByBoardId, 
    boardId ? { boardId } : "skip"
  );

  return {
    cards: cards || [],
    isLoading: cards === undefined && boardId !== undefined
  };
};