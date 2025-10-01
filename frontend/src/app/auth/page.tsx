"use client";

import Link from "next/link";
import { Github, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_API ?? "https://localhost:4000";

// ----- Schemas -----
const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Please enter a password"),
});
type LoginValues = z.infer<typeof loginSchema>;

const registerSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Min 8 characters"),
  // Add confirm if you want:
  // confirm: z.string()
  // }).refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords do not match" })
});
type RegisterValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [tab, setTab] = useState<"register" | "login">("register");

  // Login form
  const {
    register: loginReg,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErr, isSubmitting: loggingIn },
    reset: resetLogin,
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  // Register form
  const {
    register: regReg,
    handleSubmit: handleRegisterSubmit,
    formState: { errors: regErr, isSubmitting: registering },
    reset: resetRegister,
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  // ----- Actions -----
  async function onLogin(values: LoginValues) {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.message ?? data?.error ?? "Login failed";
        throw new Error(Array.isArray(msg) ? msg.join(", ") : msg);
      }
      toast.success("Logged in!");
      // Redirect if you like:
      window.location.href = "/dashboard";
      resetLogin();
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    }
  }

  async function onRegister(values: RegisterValues) {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.message ?? data?.error ?? "Registration failed";
        throw new Error(Array.isArray(msg) ? msg.join(", ") : msg);
      }
      toast.success("Registered successfully. You can sign in now.");
      resetRegister();
      setTab("login");
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
    }
  }

  function onGithub() {
    window.location.href = `${API_BASE}/auth/github`;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-[95vw] h-[90vh] p-0 gap-0 overflow-hidden rounded-3xl border bg-card shadow-xl">
        <div className="grid h-full grid-cols-1 md:grid-cols-2">
          {/* LEFT PANE */}
          <div className="h-full bg-muted md:border-r md:border-border">
            <div className="flex h-full flex-col justify-between p-8">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border">
                  ⌘
                </span>
                <span className="font-medium text-foreground">FretVault</span>
              </div>

              <div className="flex flex-1 items-center justify-center">
                <div className="grid h-48 w-48 place-items-center rounded-full bg-primary/20">
                  <span className="text-6xl">🎸</span>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-foreground">
                  The Ultimate Guitar Learning Partner
                </p>
                <p className="text-xs text-muted-foreground">
                  KIWI Software Development
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT PANE */}
          <div className="relative flex h-full items-center justify-center bg-background p-8">
            {/* Optional: remove since tabs exist */}
            <Link
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setTab("login");
              }}
              className="absolute right-8 top-8 text-sm text-muted-foreground hover:underline"
            >
              Login
            </Link>

            <div className="w-full max-w-sm space-y-6">
              <div className="text-center space-y-1">
                <h1 className="text-2xl font-semibold">
                  {tab === "register" ? "Create an account" : "Welcome back"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {tab === "register"
                    ? "Enter your details to create your account"
                    : "Enter your credentials to access your account"}
                </p>
              </div>

              {/* Tabs */}
              <Tabs
                value={tab}
                onValueChange={(v) => setTab(v as "register" | "login")}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Register</TabsTrigger>
                </TabsList>

                {/* LOGIN */}
                <TabsContent value="login" className="space-y-4 pt-4">
                  <form
                    className="space-y-4"
                    onSubmit={handleLoginSubmit(onLogin)}
                  >
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="name@example.com"
                        {...loginReg("email")}
                      />
                      {loginErr.email && (
                        <p className="text-sm text-destructive">
                          {loginErr.email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        {...loginReg("password")}
                      />
                      {loginErr.password && (
                        <p className="text-sm text-destructive">
                          {loginErr.password.message}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loggingIn}
                    >
                      {loggingIn ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Signing in…
                        </span>
                      ) : (
                        "Sign in"
                      )}
                    </Button>

                    {/* <div className="relative">
                      <Separator />
                      <span className="absolute inset-x-0 -top-2 mx-auto w-max bg-background px-2 text-[11px] tracking-wide text-muted-foreground">
                        OR CONTINUE WITH
                      </span>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-center gap-2"
                      onClick={onGithub}
                    >
                      <Github className="h-4 w-4" />
                      GitHub
                    </Button> */}
                  </form>
                </TabsContent>

                {/* REGISTER */}
                <TabsContent value="register" className="space-y-4 pt-4">
                  <form
                    className="space-y-4"
                    onSubmit={handleRegisterSubmit(onRegister)}
                  >
                    <div className="space-y-2">
                      <Label htmlFor="reg-email">Email</Label>
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="name@example.com"
                        {...regReg("email")}
                      />
                      {regErr.email && (
                        <p className="text-sm text-destructive">
                          {regErr.email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reg-password">Password</Label>
                      <Input
                        id="reg-password"
                        type="password"
                        placeholder="At least 8 characters"
                        {...regReg("password")}
                      />
                      {regErr.password && (
                        <p className="text-sm text-destructive">
                          {regErr.password.message}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={registering}
                    >
                      {registering ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Creating…
                        </span>
                      ) : (
                        "Create account"
                      )}
                    </Button>

                    <p className="px-2 text-center text-xs leading-relaxed text-muted-foreground">
                      By clicking continue, you agree to our{" "}
                      <Link
                        href="/terms"
                        className="underline underline-offset-4 hover:text-primary"
                      >
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link
                        href="/privacy"
                        className="underline underline-offset-4 hover:text-primary"
                      >
                        Privacy Policy
                      </Link>
                      .
                    </p>
                  </form>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
