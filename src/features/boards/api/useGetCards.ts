import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Doc, Id } from "../../../../convex/_generated/dataModel";

const EMPTY_CARDS: Doc<"cards">[] = [];

export const useGetBoardCards = (boardId?: Id<"boards">) => {
  const cards = useQuery(
    api.cards.getByBoardId, 
    boardId ? { boardId } : "skip"
  );

  return {
    cards: cards ?? EMPTY_CARDS,
    isLoading: cards === undefined && boardId !== undefined
  };
};
