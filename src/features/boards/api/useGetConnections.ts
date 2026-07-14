import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Doc, Id } from "../../../../convex/_generated/dataModel";

const EMPTY_CONNECTIONS: Doc<"cardConnections">[] = [];

export const useGetConnections = (boardId?: Id<"boards">) => {
  const connections = useQuery(
    api.cards.getConnectionsByBoard, 
    boardId ? { boardId } : "skip"
  );

  return {
    connections: connections ?? EMPTY_CONNECTIONS,
    isLoading: connections === undefined && boardId !== undefined
  };
};
