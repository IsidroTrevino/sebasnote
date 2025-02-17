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
        <Card className="w-[420px] h-auto px-5 rounded-xl shadow-lg bg-[#2a2a2a] border-[#3a3a3a]">
            <CardHeader className="gap-y-4">
                <CardTitle className="font-bold text-3xl text-gray-200">
                    Log In
                </CardTitle>
                <CardDescription className="font-normal text-gray-400">
                    Use your email or another provider to log in.
                </CardDescription>
                {!!error && (
                <div className="bg-red-500/10 p-3 rounded-md flex items-center gap-x-2 text-sm text-red-400">
                    <TriangleAlert className="size-4"/>
                    <p>{error}</p>
                </div>
            )}
            </CardHeader>
            <CardContent className="">
                <form onSubmit={onPasswordSignIn} className="space-y-4">
                    <Input 
                        className="w-full bg-[#1a1a1a] border-[#3a3a3a] text-gray-200 placeholder:text-gray-500 focus:ring-[#4a4a4a] focus:border-[#4a4a4a]" 
                        type="email" 
                        placeholder="Email" 
                        onChange={(e) => {setEmail(e.target.value)}} 
                        value={email} 
                        required
                    />
                    <Input 
                        className="w-full bg-[#1a1a1a] border-[#3a3a3a] text-gray-200 placeholder:text-gray-500 focus:ring-[#4a4a4a] focus:border-[#4a4a4a]" 
                        type="password" 
                        placeholder="Password" 
                        onChange={(e) => {setPassword(e.target.value)}} 
                        value={password} 
                        required
                    />
                    <Button 
                        className="w-full p-5 font-semibold text-sm bg-[#3a3a3a] hover:bg-[#4a4a4a] text-gray-200" 
                        type="submit"
                    >
                        Log In
                    </Button>
                </form>
                <Separator className="my-5 bg-[#3a3a3a]" />
                <div className="flex justify-center items-center flex-col space-y-2">
                    <div className="flex justify-center items-center space-x-6">
                        <Button 
                            variant={'outline'} 
                            className="rounded-full p-2 h-auto bg-[#2a2a2a] border-[#3a3a3a] hover:bg-[#3a3a3a]" 
                            onClick={() => {handleProviderLogin("google")}}
                        >
                            <FcGoogle className="size-10" />
                        </Button>
                        <Button 
                            variant={'outline'} 
                            className="rounded-full p-2 h-auto bg-[#2a2a2a] border-[#3a3a3a] hover:bg-[#3a3a3a]" 
                            onClick={() => {handleProviderLogin("github")}}
                        >
                            <FaGithub className="text-gray-200" />
                        </Button>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="font-normal text-gray-400 text-sm flex items-center justify-center">
                Don&apos;t have an account? <Link href="/auth/SignUp" className="ml-1 text-blue-400 hover:text-blue-300 font-medium">Sign Up</Link>
            </CardFooter>
        </Card>
    );
};