import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

export const useGetDocument = (boardId?: Id<"boards">) => {
  const document = useQuery(
    api.documents.get, 
    boardId ? { boardId } : "skip"
  );

  return {
    document,
    isLoading: document === undefined && boardId !== undefined
  };
};