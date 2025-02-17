import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { useAuthActions } from "@convex-dev/auth/react";
import Link from "next/link";
import { useState } from "react";
import { TriangleAlert } from "lucide-react";


export const SignUpScreen = () => {
    const {signIn} = useAuthActions();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");

    const onPasswordSignUp = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setPending(true);

        signIn("password", {name, email, password, flow: "signUp"})
        .catch(() => {
            setError("Something went wrong");
        })
        .finally(() => {
            setPending(false);
        });
    }

    const handleProviderLogin = async (provider: "github" | "google") => {
        try {
            await signIn(provider);
        } catch(error) {
            throw new Error("Error: " + error);
        }
    };
    
    return (
        <Card className="w-[420px] h-auto px-5 rounded-xl shadow-lg bg-[#2a2a2a] border-[#3a3a3a]">
            <CardHeader className="gap-y-4">
                <CardTitle className="font-bold text-3xl text-gray-200">
                    Sign Up
                </CardTitle>
                <CardDescription className="font-normal text-gray-400">
                    Make sure to fill all the fields to sign up.
                </CardDescription>
                {!!error && (
                    <div className="bg-red-500/10 p-3 rounded-md flex items-center gap-x-2 text-sm text-red-400">
                        <TriangleAlert className="size-4"/>
                        <p>{error}</p>
                    </div>
                )}
            </CardHeader>
            <CardContent className="">
                <form onSubmit={onPasswordSignUp} className="space-y-4">
                    <Input 
                        className="w-full bg-[#1a1a1a] border-[#3a3a3a] text-gray-200 placeholder:text-gray-500 focus:ring-[#4a4a4a] focus:border-[#4a4a4a]" 
                        type="text" 
                        placeholder="Username" 
                        onChange={(e) => setName(e.target.value)} 
                        value={name} 
                        disabled={pending} 
                        required
                    />
                    <Input 
                        className="w-full bg-[#1a1a1a] border-[#3a3a3a] text-gray-200 placeholder:text-gray-500 focus:ring-[#4a4a4a] focus:border-[#4a4a4a]" 
                        type="email" 
                        placeholder="Email" 
                        onChange={(e) => setEmail(e.target.value)} 
                        value={email} 
                        disabled={pending} 
                        required
                    />
                    <Input 
                        className="w-full bg-[#1a1a1a] border-[#3a3a3a] text-gray-200 placeholder:text-gray-500 focus:ring-[#4a4a4a] focus:border-[#4a4a4a]" 
                        type="password" 
                        placeholder="Password" 
                        onChange={(e) => setPassword(e.target.value)} 
                        value={password} 
                        disabled={pending} 
                        required
                    />
                    <Input 
                        className="w-full bg-[#1a1a1a] border-[#3a3a3a] text-gray-200 placeholder:text-gray-500 focus:ring-[#4a4a4a] focus:border-[#4a4a4a]" 
                        type="password" 
                        placeholder="Password" 
                        onChange={(e) => setConfirmPassword(e.target.value)} 
                        value={confirmPassword} 
                        disabled={pending} 
                        required
                    />
                    <Button 
                        className="w-full p-5 font-semibold text-sm bg-[#3a3a3a] hover:bg-[#4a4a4a] text-gray-200" 
                        type="submit" 
                        disabled={pending}
                    >
                        Sign Up
                    </Button>
                </form>
                <Separator className="my-5 bg-[#3a3a3a]" />
                <div className="flex justify-center items-center space-x-6">
                    <Button 
                        variant={'outline'} 
                        className="rounded-full p-2 h-auto bg-[#2a2a2a] border-[#3a3a3a] hover:bg-[#3a3a3a]" 
                        onClick={() => {handleProviderLogin("google")}} 
                        disabled={pending}
                    >
                        <FcGoogle className="size-10" />
                    </Button>
                    <Button 
                        variant={'outline'} 
                        className="rounded-full p-2 h-auto bg-[#2a2a2a] border-[#3a3a3a] hover:bg-[#3a3a3a]" 
                        onClick={() => {handleProviderLogin("github")}} 
                        disabled={pending}
                    >
                        <FaGithub className="text-gray-200"/>
                    </Button>
                </div>
            </CardContent>
            <CardFooter className="font-normal text-gray-400 text-sm flex items-center justify-center">
                Already have an account? <Link href="/auth/LogIn" className="ml-1 text-blue-400 hover:text-blue-300 font-medium">Log In</Link>
            </CardFooter>
        </Card>
    );
};