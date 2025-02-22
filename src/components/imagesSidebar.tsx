import { BoardType } from "@/features/types/boardType";
import { Ellipsis, Loader, Plus } from "lucide-react";
import { ReferenceImages } from "./referenceImages";
import { useReferenceImageModal } from "@/features/boards/store/useUploadImageModal";

interface ImagesSidebarProps {
    board: BoardType;
}

const ImagesSidebar = ({ board }: ImagesSidebarProps) => {
    const [, setOpen] = useReferenceImageModal();

    if (!board) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader className="animate-spin size-6"/>
            </div>
        );
    }

    return (
        <div className="p-4 h-[50%] overflow-auto">
            <div className="flex flex-row items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-400">
                    Reference Images
                </h2>
                <Plus 
                    size={20} 
                    className="cursor-pointer text-gray-400 hover:text-gray-200" 
                    onClick={() => setOpen(true)}
                />
            </div>
            <ReferenceImages board={board} />
        </div>
    );
};

export default ImagesSidebar;