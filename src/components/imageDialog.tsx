import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";
import Image from "next/image";

interface ImageDialogProps {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string;
}

export const ImageDialog = ({ isOpen, onClose, imageUrl }: ImageDialogProps) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogTitle>
                
            </DialogTitle>
            <DialogContent className="max-w-[60vw] max-h-[60vh] p-0 bg-transparent border-none overflow-hidden">
                <button 
                    onClick={onClose}
                    className="absolute top-2 right-2 z-[60] rounded-full p-2 bg-black/50 hover:bg-black/75 transition"
                >
                    <X className="h-4 w-4 text-white" />
                </button>
                <div className="relative w-full aspect-[16/9]">
                    <Image
                        src={imageUrl}
                        fill
                        alt="Reference image"
                        className="object-contain"
                        priority
                        sizes="95vw"
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
};