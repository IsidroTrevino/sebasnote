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
import { useBoardAncestors } from "../api/useGetBoardAncestors";

const UpdateBoardModal = () => {
    const [boardName, setBoardName] = useState('');
    const [open, setOpen] = useUpdateBoardModal();
    const { mutate: update, isPending } = useUpdateBoard();
    const { mutate: deleteBoard } = useDeleteBoard();
    const boardId = useBoardId();
    const board = useGetBoard({ id: boardId });
    const parentBoard = useGetBoard({ id: board?.parentId });
    const ancestors = useBoardAncestors();
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

        // Store parent info before deletion
        const parentFromAncestors = Array.isArray(ancestors)
            ? ancestors[ancestors.length - 2]
            : undefined;
        const parentId = parentFromAncestors?._id ?? board?.parentId;
        const parentName = parentFromAncestors?.name ?? parentBoard?.name ?? "board";
        const parentRoute = parentId ? `/${parentId}/${encodeURIComponent(parentName)}` : null;

        if (typeof window !== "undefined") {
            if (parentRoute) {
                sessionStorage.setItem("pendingBoardRedirect", parentRoute);
            } else {
                sessionStorage.removeItem("pendingBoardRedirect");
            }
        }

        deleteBoard({boardId}, {
            onSuccess: () => {
                toast.success('Board deleted successfully');
                // Redirect to parent board if it exists, otherwise go to home
                if (parentId) {
                    router.replace(`/${parentId}/${encodeURIComponent(parentName)}`);
                } else {
                    router.push(`/`);
                }
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
                onSuccess: () => {
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
