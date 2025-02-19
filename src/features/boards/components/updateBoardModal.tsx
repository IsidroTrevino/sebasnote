import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBoardId } from "../api/useBoardId";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUpdateBoardModal } from "../store/useUpdateBoardModal";
import { useUpdateBoard } from "../api/useUpdateBoard";
import { useGetBoard } from "../api/useGetBoard";
import { TrashIcon } from "lucide-react";
import { useConfirm } from "@/features/auth/hooks/useConfirm";
import { useRouter } from "next/navigation";
import { useDeleteBoard } from "../api/useDeleteBoard";

const UpdateBoardModal = () => {
    const [boardName, setBoardName] = useState('');
    const [open, setOpen] = useUpdateBoardModal();
    const { mutate: update, isPending } = useUpdateBoard();
    const { mutate: deleteBoard } = useDeleteBoard();
    const boardId = useBoardId();
    const board = useGetBoard({ id: boardId });
    const [ConfirmDialog, confirm] = useConfirm('Delete this board?', "You're about to delete this board, this action is irreversible.");
    const router = useRouter();

    useEffect(() => {
        if (board?.name) {
            setBoardName(board.name);
        }
    }, [board?.name]);

    const handleClose = () => {
        setBoardName('');
        setOpen(false);
    }

    const handleDelete = async () => {
        const ok = await confirm();

        if(!ok) return;

        deleteBoard({boardId}, {
            onSuccess: () => {
                toast.success('Board deleted successfully');
                router.push(`/`);
                setOpen(false);
            },
            onError: () => {
                toast.error('Failed to delete board');
            }
        });
    }

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        update(
            {name: boardName, boardId: boardId},
            {
                onSuccess: (id) => {
                    toast.success('Board renamed successfully');
                    handleClose();
                },
                onError: () => {
                    toast.error('Failed to rename board');
                }
            }
        );
    }  

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setBoardName(value);
    }

    return (
        <>
            <ConfirmDialog />
            <Dialog open={open} onOpenChange={() => handleClose()}>
                <DialogContent className="bg-[#2a2a2a] text-gray-300 border-[#3a3a3a]">
                    <DialogHeader>
                        <DialogTitle>
                            Update your board
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input 
                            className="bg-[#4a4a4a] border-[#3a3a3a] focus:border-[#2a2a2a] text-gray-300" 
                            value={boardName}
                            disabled={isPending} 
                            onChange={handleChange} 
                            required 
                            autoFocus 
                            minLength={3} 
                            maxLength={80} 
                            placeholder="e.g. Characters"
                        />
                        <div className="flex justify-between">
                            <Button 
                                disabled={isPending} 
                                type="submit" 
                                className="hover:bg-[#3a3a3a] bg-[#3a3a3a] text-gray-300"
                            >
                                Update
                            </Button>
                            <Button 
                                type="button"
                                disabled={isPending} 
                                className="bg-rose-500 hover:bg-rose-400 transition-all text-white"
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleDelete();
                                }}
                            >
                                <TrashIcon className="size-6" />
                                Delete
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

export default UpdateBoardModal
