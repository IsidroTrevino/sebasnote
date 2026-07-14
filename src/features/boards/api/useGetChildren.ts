import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Doc, Id } from "../../../../convex/_generated/dataModel";

const EMPTY_BOARDS: Doc<"boards">[] = [];

export const useGetChildren = (parentId?: Id<"boards">) => {
    const boardsData = useQuery(api.boards.getChildren, { parentId });
    const isLoading = boardsData === undefined;

    return {
        boards: boardsData ?? EMPTY_BOARDS,
        isLoading,
    };
};
