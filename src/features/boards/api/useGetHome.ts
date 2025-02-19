import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export const useGetHome = () => {
    const boardsData = useQuery(api.boards.getHome);
    const isLoading = boardsData === undefined;

    return {
        homeBoard: boardsData?.home ?? null,
        isLoading
    };
};