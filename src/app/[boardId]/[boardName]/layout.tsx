'use client';

import Header from "./header";

interface BoardNameLayoutProps {
    children: React.ReactNode;
}

const BoardNameLayout = ({ children }: BoardNameLayoutProps) => {
    return (
        <div>
            <Header/>
            {children}
        </div>
    );
}

export default BoardNameLayout;