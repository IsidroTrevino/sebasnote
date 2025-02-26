'use client';

import { useEffect, useState } from "react";
import CreateBoardModal from "@/features/boards/components/createBoardModal";
import UpdateBoardModal from "@/features/boards/components/updateBoardModal";
import { UploadReferenceImageModal } from "@/features/boards/components/uploadReferenceImageModal";
import { CreateCardModal } from "@/features/boards/components/createCardModal";

export const Modals = () => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return null;
    }
    
    return (
        <>
            <CreateCardModal/>
            <UploadReferenceImageModal/>
            <UpdateBoardModal/>
            <CreateBoardModal/>
        </>
    );
};