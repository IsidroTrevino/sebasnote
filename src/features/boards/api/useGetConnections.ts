import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

export const useGetConnections = (boardId?: Id<"boards">) => {
  const connections = useQuery(
    api.cards.getConnectionsByBoard, 
    boardId ? { boardId } : "skip"
  );

  return {
    connections: connections || [],
    isLoading: connections === undefined && boardId !== undefined
  };
};
