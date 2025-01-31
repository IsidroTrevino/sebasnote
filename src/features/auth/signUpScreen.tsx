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
        <Card className="w-[420px] h-auto px-5 rounded-xl shadow-lg">
            <CardHeader className="gap-y-4">
                <CardTitle className="font-bold text-3xl">
                    Sign Up
                </CardTitle>
                <CardDescription className="font-normal text-muted-foreground pb-4">
                    Make sure to fill all the fields to sign up.
                </CardDescription>
                {!!error && (
                <div className="bg-destructive/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-destructive mb-6">
                    <TriangleAlert className="size-4"/>
                    <p>{error}</p>
                </div>
            )}
            </CardHeader>
            <CardContent className="">
                <form onSubmit={onPasswordSignUp} className="space-y-4">
                    <Input className="w-full" type="text" placeholder="Username" onChange={(e) => setName(e.target.value)} value={name} />
                    <Input className="w-full" type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} value={email}/>
                    <Input className="w-full" type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} value={password}/>
                    <Input className="w-full" type="password" placeholder="Password" onChange={(e) => setConfirmPassword(e.target.value)} value={confirmPassword}/>
                    <Button className="w-full p-5 font-semibold text-sm" type="submit">
                        Sign Up
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
            <CardFooter className="font-normal text-muted-foreground text-sm flex items-center justify-center">
                Already have an account? <Link href="/auth/LogIn" className="ml-1 underline text-sky-400 font-medium">Log In</Link>
            </CardFooter>
        </Card>
    );
};