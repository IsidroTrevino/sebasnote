import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Doc } from "../../../../convex/_generated/dataModel";

const EMPTY_BOARDS: Doc<"boards">[] = [];

export const useListAllBoards = () => {
  const boardsData = useQuery(api.boards.listAll, {});
  const isLoading = boardsData === undefined;

  return {
    boards: boardsData ?? EMPTY_BOARDS,
    isLoading,
  };
};
