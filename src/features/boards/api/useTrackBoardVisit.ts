import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

export const useTrackBoardVisit = () => {
    const mutation = useMutation(api.boards.trackBoardVisit);

    return {
        trackVisit: (boardId: Id<"boards">) => {
            mutation({ boardId }).catch(error => {
                console.error("Failed to track board visit:", error);
            });
        }
    };
};
