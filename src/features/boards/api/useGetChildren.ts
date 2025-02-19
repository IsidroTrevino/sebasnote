import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

export const useGetChildren = (parentId?: Id<"boards">) => {
    const boardsData = useQuery(api.boards.getChildren, { parentId });
    const isLoading = boardsData === undefined;

    return {
        boards: boardsData ?? [],
        isLoading,
    };
};