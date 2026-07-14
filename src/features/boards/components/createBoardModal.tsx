import { useState } from "react";
import { toast } from "sonner";
import { useCreateBoardModal } from "../store/useCreateBoardModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBoardId } from "../api/useBoardId";
import { useCreateBoard } from "../api/useCreateBoard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGetBoard } from "../api/useGetBoard";
import { useUploadProjectCover } from "../api/useUploadProjectCover";
import { Loader } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const CreateBoardModal = () => {
    const [boardName, setBoardName] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [open, setOpen] = useCreateBoardModal();
    const { mutate, isPending } = useCreateBoard();
    const { mutate: uploadCover } = useUploadProjectCover();
    const boardId = useBoardId();
    const parent = useGetBoard({ id: boardId });
    const isParentHome = parent?.isHome === true;
    const [boardType, setBoardType] = useState("Document");

    const handleClose = () => {
        setBoardName('');
        setImageFile(null);
        setBoardType("Document");
        setOpen(false);
    }

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setImageFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        if (isSubmitting) return;
        
        setIsSubmitting(true);
        
        try {
            const boardPayload = {
                name: boardName, 
                parentId: boardId, 
                isHome: false,
                isDocument: boardType === "Document",
                isSpotify: boardType === "Spotify",
                isExcel: boardType === "Excel",
                ...(boardType === "Ranking" ? { isRanking: true } : {}),
            };

            const newBoardId = await mutate(boardPayload);

            if (isParentHome && imageFile && newBoardId) {
                await uploadCover({
                    boardId: newBoardId,
                    file: imageFile
                });
            }

            toast.success('Board created successfully');
            handleClose();
        } catch {
            toast.error('Failed to create board');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={() => handleClose()}>
            <DialogContent aria-describedby={undefined} className="bg-[#2a2a2a] text-gray-300 border-[#3a3a3a]">
                <DialogHeader>
                    <DialogTitle>
                        Add a board
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input 
                        id="board-name"
                        name="boardName"
                        className="bg-[#4a4a4a] border-[#3a3a3a] focus:border-[#2a2a2a] text-gray-300" 
                        value={boardName} 
                        disabled={isPending} 
                        onChange={(e) => setBoardName(e.target.value)} 
                        required 
                        autoFocus 
                        minLength={3} 
                        maxLength={80} 
                        placeholder="e.g. Characters"
                    />

                    <RadioGroup 
                        value={boardType}
                        onValueChange={setBoardType}
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Document" id="r1" />
                            <Label htmlFor="r1">Document</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Card" id="r2" />
                            <Label htmlFor="r2">Card Grid</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Spotify" id="r3" />
                            <Label htmlFor="r3">Spotify Songs</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Excel" id="r4" />
                            <Label htmlFor="r4">Spreadsheet</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="Ranking" id="r5" />
                            <Label htmlFor="r5">Ranking Board</Label>
                        </div>
                    </RadioGroup>
                    
                    {isParentHome && (
                        <div className="space-y-2">
                            <label htmlFor="project-cover" className="text-sm text-gray-400">
                                Project Cover Image
                            </label>
                            <Input 
                                id="project-cover"
                                name="projectCover"
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="bg-[#4a4a4a] border-[#3a3a3a] focus:border-[#2a2a2a] text-gray-300"
                            />
                        </div>
                    )}

                <div className="flex justify-end">
                    <Button 
                        disabled={isPending || isSubmitting}
                        className="hover:bg-[#3a3a3a] bg-[#3a3a3a] text-gray-300" 
                        type="submit"
                        >
                        {isSubmitting ? (
                            <Loader className="w-5 h-5 animate-spin" />
                        ) : 'Create'}
                    </Button>
                </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default CreateBoardModal;
