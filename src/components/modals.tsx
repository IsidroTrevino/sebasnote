'use client';

import { useEffect, useState } from "react";
import CreateBoardModal from "@/features/boards/components/createBoardModal";
import UpdateBoardModal from "@/features/boards/components/updateBoardModal";

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
            <UpdateBoardModal/>
            <CreateBoardModal/>
        </>
    );
};