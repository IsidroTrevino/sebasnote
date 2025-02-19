import { useState } from "react";
import { toast } from "sonner";
import { useCreateBoardModal } from "../store/useCreateBoardModal";
import { Dialog, DialogDescription, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBoardId } from "../api/useBoardId";
import { useCreateBoard } from "../api/useCreateBoard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";


const CreateBoardModal = () => {
    const [boardName, setBoardName] = useState('');
    const [open, setOpen] = useCreateBoardModal();
    const{mutate, isPending} = useCreateBoard();
    const boardId = useBoardId();

    const handleClose = () => {
        setBoardName('');
        setOpen(false);
    }

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        mutate(
            {name: boardName, parentId: boardId},
            {
                onSuccess: (id) => {
                    toast.success('Board created successfully');
                    handleClose();
                },
                onError: () => {
                    toast.error('Failed to create board');
                }
            }
        );
    }  

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setBoardName(value);
    }

    return (
        <Dialog open={open} onOpenChange={() => handleClose()}>
            <DialogContent className="bg-[#2a2a2a] text-gray-300 border-[#3a3a3a]">
                <DialogHeader>
                    <DialogTitle>
                        Add a board
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input className="bg-[#4a4a4a] border-[#3a3a3a] focus:border-[#2a2a2a] text-gray-300" value={boardName} disabled={isPending} onChange={handleChange} required autoFocus minLength={3} maxLength={80} placeholder="e.g. Characters"/>
                    <div className="flex justify-end">
                        <Button disabled={false} className="hover:bg-[#3a3a3a] bg-[#3a3a3a] text-gray-300" type="submit">
                            Create
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}

export default CreateBoardModal
