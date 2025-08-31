import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export const useListAllBoards = () => {
  const boardsData = useQuery(api.boards.listAll, {});
  const isLoading = boardsData === undefined;

  return {
    boards: boardsData ?? [],
    isLoading,
  };
};
