import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export const useGetBoards = () => {
    const boardsData = useQuery(api.boards.get);
    const isLoading = boardsData === undefined;

    return {
        boards: boardsData?.children ?? [],
        homeBoard: boardsData?.home ?? null,
        isLoading
    };
};