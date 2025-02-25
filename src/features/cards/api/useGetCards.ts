import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

export const useGetCards = (boardId: Id<"boards">) => {
  return useQuery(api.cards.getByBoardId, { boardId });
};