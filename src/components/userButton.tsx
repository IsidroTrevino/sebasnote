'use client';

import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useAuthActions } from "@convex-dev/auth/react";
import { CameraIcon, Loader } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "./ui/dropdown-menu";


export const UserButton = () => {
    const router = useRouter();
    const {data: user, isLoading: isUserLoading} = useCurrentUser();
    const {signOut} = useAuthActions();

    const handleSignOut = async () => {
        await signOut();
        router.replace("/auth/LogIn");
    }

    if (isUserLoading) {
        return <Loader className="size-4 animate-spin text-muted-foreground"/>
    }

    if (!user) {
        return null;
    }

    const {image, name} = user;
    const avatarFallback = name?.charAt(0).toUpperCase();

    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger>
                <Avatar className='rounded-full cursor-pointer hover:opacity-75 hover:shadow-md transition size-8'>
                    <AvatarImage src={image} alt={name} className="rounded-full"/>
                    <AvatarFallback className="rounded-md bg-sky-500 text-white">
                        {avatarFallback}
                    </AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="mr-4">
                <div className="flex flex-col items-center p-4">
                    <div className="flex flex-row items-center gap-x-8">
                        <div className="truncate w-[180px]">
                            <p className="text-md font-medium truncate">{name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                        <div>
                            <div className="relative group">
                                <Avatar className='rounded-full cursor-pointer hover:opacity-75 hover:shadow-md transition size-14'>
                                    <AvatarImage src={image} alt={name} className="rounded-full size-14"/>
                                    <AvatarFallback className="rounded-md bg-sky-500 text-white">
                                        {avatarFallback}
                                    </AvatarFallback>
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                        <CameraIcon className="size-6 text-white" />
                                    </div>
                                </Avatar>
                            </div>
                        </div>
                        </div>
                        <div className="flex flex-row justify-start w-full gap-x-8">
                            <p className="text-sm text-orange-600 hover:underline cursor-pointer">Account settings</p>
                            <p className="text-sm text-orange-600 hover:underline cursor-pointer" onClick={handleSignOut}>Log Out</p>
                        </div>
                    </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}