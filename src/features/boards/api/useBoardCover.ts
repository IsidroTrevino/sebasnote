import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

interface UseBoardCoverProps {
  boardId: Id<"boards">;
}

export const useBoardCover = ({ boardId }: UseBoardCoverProps) => {
  const data = useQuery(api.projectCovers.getByBoardId, { boardId });
  return {
    data,
    isLoading: data === undefined
  };
};