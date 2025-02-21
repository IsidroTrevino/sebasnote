import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

interface UploadProjectCoverArgs {
    boardId: Id<"boards">;
    file: File;
}

export const useUploadProjectCover = () => {
    const generateUploadUrl = useMutation(api.projectCovers.generateUploadUrl);
    const saveProjectCover = useMutation(api.projectCovers.create);

    const mutate = async ({ boardId, file }: UploadProjectCoverArgs) => {
        const postUrl = await generateUploadUrl();
        
        const result = await fetch(postUrl, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file
        });
        const { storageId } = await result.json();

        return await saveProjectCover({
            boardId,
            storageId
        });
    };

    return { mutate };
};