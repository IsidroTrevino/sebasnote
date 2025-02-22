import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

interface UploadReferenceImageArgs {
    boardId: Id<"boards">;
    file: File;
    name: string;
}

export const useUploadReferenceImage = () => {
    const generateUploadUrl = useMutation(api.referenceImages.generateUploadUrl);
    const saveReferenceImage = useMutation(api.referenceImages.create);

    const mutate = async ({ boardId, file, name }: UploadReferenceImageArgs) => {
        const postUrl = await generateUploadUrl();
        
        const result = await fetch(postUrl, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file
        });
        
        const { storageId } = await result.json();

        return await saveReferenceImage({
            boardId,
            storageId,
            name
        });
    };

    return { mutate };
};