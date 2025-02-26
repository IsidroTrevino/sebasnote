import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { useBoardId } from "../api/useBoardId";
import { useUploadReferenceImage } from "../api/useReferenceImage";
import { useReferenceImageModal } from "../store/useUploadImageModal";

export const UploadReferenceImageModal = () => {
    const [imageName, setImageName] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [open, setOpen] = useReferenceImageModal();
    const { mutate } = useUploadReferenceImage();
    const boardId = useBoardId();

    const handleClose = () => {
        setOpen(false);
        setImageName("");
        setFile(null);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!file || !boardId) return;
        
        setIsSubmitting(true);
        try {
            await mutate({
                boardId,
                file,
                name: imageName || file.name
            });
            toast.success("Image uploaded successfully");
            handleClose();
        } catch {
            toast.error("Failed to upload image");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="bg-[#2a2a2a] text-gray-300 border-[#3a3a3a]">
                <DialogHeader>
                    <DialogTitle>Upload Reference Image</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        placeholder="Image name (optional)"
                        value={imageName}
                        onChange={(e) => setImageName(e.target.value)}
                        className="bg-[#4a4a4a] border-[#3a3a3a] focus:border-[#2a2a2a] text-gray-300"
                    />
                    <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        required
                        className="bg-[#4a4a4a] border-[#3a3a3a] focus:border-[#2a2a2a] text-gray-300"
                    />
                    <div className="flex justify-end">
                        <Button 
                            disabled={isSubmitting} 
                            type="submit"
                            className="bg-[#3a3a3a] hover:bg-[#4a4a4a] text-gray-300"
                        >
                            {isSubmitting ? "Uploading..." : "Upload"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};