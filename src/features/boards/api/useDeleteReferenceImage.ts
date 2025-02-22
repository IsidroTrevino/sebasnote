
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

export const useDeleteReferenceImage = () => {
    const deleteImage = useMutation(api.referenceImages.deleteImage);

    return {
        mutate: (imageId: Id<"referenceImages">) => deleteImage({ imageId })
    };
};