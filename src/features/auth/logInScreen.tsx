import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import {TriangleAlert} from 'lucide-react'
import { useAuthActions } from "@convex-dev/auth/react";
import Link from "next/link";
import { useState } from "react";


export const LogInScreen = () => {
    const {signIn} = useAuthActions();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [pending, setPending] = useState(false);

    const handleProviderLogin = async (provider: "github" | "google") => {
        try {
            await signIn(provider);
        } catch(error) {
            throw new Error("Error: " + error);
        }
    };

    const onPasswordSignIn = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setPending(true);
        signIn("password", {email, password, flow: "signIn"})
        .catch(() => {
            setError("Invalid email or password");
        })
        .finally(() => {
            setPending(false);
        });
    }

    return (
        <Card className="w-[420px] h-auto px-5 rounded-xl shadow-lg">
            <CardHeader className="gap-y-4">
                <CardTitle className="font-bold text-3xl">
                    Log In
                </CardTitle>
                <CardDescription className="font-normal text-muted-foreground">
                    Use your email or another provider to log in.
                </CardDescription>
                {!!error && (
                <div className="bg-destructive/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-destructive">
                    <TriangleAlert className="size-4"/>
                    <p>{error}</p>
                </div>
            )}
            </CardHeader>
            <CardContent className="">
                <form onSubmit={onPasswordSignIn} className="space-y-4">
                    <Input className="w-full" type="email" placeholder="Email" onChange={(e) => {setEmail(e.target.value)}} value={email} required/>
                    <Input className="w-full" type="password" placeholder="Password" onChange={(e) => {setPassword(e.target.value)}} value={password} required/>
                    <Button className="w-full p-5 font-semibold text-sm" type="submit">
                        Log In
                    </Button>
                </form>
                <Separator className="my-5" />
                <div className="flex justify-center items-center flex-col space-y-2">
                    <div className="flex justify-center items-center space-x-6">
                        <Button variant={'outline'} className="rounded-full p-2 h-auto" onClick={() => {handleProviderLogin("google")}}>
                            <FcGoogle className="size-10" />
                        </Button>
                        <Button variant={'outline'} className="rounded-full p-2 h-auto" onClick={() => {handleProviderLogin("github")}}>
                            <FaGithub />
                        </Button>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="font-normal text-muted-foreground text-sm flex items-center justify-center">
                Don&apos;t have an account? <Link href="/auth/SignUp" className="ml-1 underline text-sky-400 font-medium"> Sign Up</Link>
            </CardFooter>
        </Card>
    );
};