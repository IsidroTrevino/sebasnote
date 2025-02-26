import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useImageDialog } from "@/features/boards/store/useImageDialog";
import Image from "next/image";
import { X } from "lucide-react";

export const ImageDialog = () => {
  const { isOpen, imageUrl, close } = useImageDialog();
  
  if (!imageUrl) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogTitle></DialogTitle>
      <DialogContent className="bg-black/90 border-none p-0 max-w-7xl w-[95vw] h-[95vh] max-h-[95vh] flex items-center justify-center">
        <button 
          onClick={close}
          className="absolute right-4 top-4 bg-black/60 rounded-full p-2 hover:bg-black/80 transition-all z-10"
        >
          <X className="h-6 w-6 text-white" />
        </button>
        <div className="relative w-full h-full">
          <Image
            src={imageUrl}
            fill
            className="object-contain"
            alt="Reference image"
            sizes="(max-width: 768px) 100vw, 95vw"
            priority
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};