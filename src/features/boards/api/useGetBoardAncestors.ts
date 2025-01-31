import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useBoardId } from "./useBoardId";

export const useBoardAncestors = () => {
  const boardId = useBoardId();
  return useQuery(api.boards.getAncestors, { boardId });
};