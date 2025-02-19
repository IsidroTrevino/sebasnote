import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

interface UseGetBoardProps {
  id: Id<"boards"> | undefined;
}

export const useGetBoard = ({ id }: UseGetBoardProps) => {
  return useQuery(
    api.boards.getById,
    id ? { boardId: id } : "skip"
  );
};