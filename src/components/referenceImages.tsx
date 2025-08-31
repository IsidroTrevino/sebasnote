import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { BoardType } from "@/features/types/boardType";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { useDeleteReferenceImage } from "@/features/boards/api/useDeleteReferenceImage";
import { toast } from "sonner";
import { useState } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { useImageDialog } from "@/features/boards/store/useImageDialog";

interface ReferenceImagesGridProps {
    board: BoardType;
}

export const ReferenceImages = ({ board }: ReferenceImagesGridProps) => {
    const images = useQuery(api.referenceImages.getByBoardId, { boardId: board._id });
    const { mutate: deleteImage } = useDeleteReferenceImage();
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const { open: openImageDialog } = useImageDialog();

    const getImageName = (url?: string | null, title?: string | null): string => {
        const t = (title || "").trim();
        if (t) return t;
        const u = (url || "").split("?")[0];
        const parts = u.split("/");
        const last = parts[parts.length - 1] || "image";
        try {
            return decodeURIComponent(last);
        } catch {
            return last;
        }
    };
    
    const handleDelete = async (imageId: Id<"referenceImages">, e: React.MouseEvent) => {
        e.stopPropagation();
        if (deletingId) return;

        try {
            setDeletingId(imageId);
            await deleteImage(imageId);
            toast.success("Image deleted successfully");
        } catch {
            toast.error("Failed to delete image");
        } finally {
            setDeletingId(null);
        }
    };

    if (!images?.length) {
        return (
            <div className="flex items-center justify-center h-full text-gray-400">
                No reference images yet
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-5">
            {images.map((image) => (
                <div 
                    key={image._id} 
                    className="group relative aspect-square cursor-pointer"
                    onClick={() => openImageDialog(image.url || '')}
                    title={getImageName(image.url || '', image.title || '')}
                    aria-label={getImageName(image.url || '', image.title || '')}
                >
                    <Image
                        src={image.url || ''}
                        fill
                        className="object-cover rounded-md"
                        alt={getImageName(image.url || '', image.title || '')}
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-all rounded-md" />
                    <div className="absolute bottom-1 left-1 z-10 max-w-[85%] truncate px-2 py-0.5 rounded bg-black/60 text-white text-[11px] leading-tight opacity-0 group-hover:opacity-100 transition-all pointer-events-none">
                        {getImageName(image.url || "", image.title || "")}
                    </div>

                    <button
                        onClick={(e) => handleDelete(image._id, e)}
                        disabled={deletingId === image._id}
                        className={`
                            absolute top-2 right-2 
                            p-1.5 
                            rounded-full
                            bg-red-500/80
                            hover:bg-red-600 
                            transition-all
                            invisible group-hover:visible
                            ${deletingId === image._id ? 'cursor-not-allowed opacity-50' : ''}
                        `}
                    >
                        <Trash2 
                            className="h-4 w-4 text-white"
                        />
                    </button>
                </div>
            ))}
        </div>
    );
};
