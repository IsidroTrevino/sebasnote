import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { useAuthActions } from "@convex-dev/auth/react";


export const LogInScreen = () => {
    const {signIn} = useAuthActions();

    const handleProviderLogin = async (provider: "github" | "google") => {
        try {
            await signIn(provider);
        } catch {
            throw new Error("Failed to sign in with provider");
        }
    };


    return (
        <Card className="w-[400px] h-auto px-5 rounded-xl shadow-lg">
            <CardHeader>
                <CardTitle className="font-bold text-3xl">
                    Log In
                </CardTitle>
                <CardDescription className="font-normal text-muted-foreground">
                    Use your email or another provider to log in.
                </CardDescription>
            </CardHeader>
            <CardContent className="">
                <form onSubmit={() => {}} className="space-y-4">
                    <Input className="w-full" type="email" placeholder="Email" />
                    <Input className="w-full" type="password" placeholder="Password" />
                    <Button className="w-full p-5 font-semibold text-sm" type="submit">
                        Log In
                    </Button>
                </form>
                <Separator className="my-5" />
                <div className="flex justify-center items-center space-x-6">
                    <Button variant={'outline'} className="rounded-full p-2 h-auto" onClick={() => {handleProviderLogin("google")}}>
                        <FcGoogle className="size-10" />
                    </Button>
                    <Button variant={'outline'} className="rounded-full p-2 h-auto" onClick={() => {handleProviderLogin("github")}}>
                        <FaGithub />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};