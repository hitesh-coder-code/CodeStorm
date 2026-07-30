import {
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router";

import {
  useState,
  type FormEvent,
} from "react";

import {
  loginUser,
  registerUser,
} from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { toast } from "sonner";


export const Route =
  createFileRoute("/login")({
    component: LoginPage,
  });


function LoginPage() {
  const navigate = useNavigate();

  const [mode, setMode] =
    useState<"login" | "register">(
      "login",
    );

  const [email, setEmail] =
    useState("");

  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setLoading(true);

    try {
      if (mode === "register") {
        await registerUser(
          email,
          username,
          password,
        );

        toast.success(
          "Account created",
        );
      }

      await loginUser(
        username,
        password,
      );

      toast.success(
        "Login successful",
      );

      await navigate({
        to: "/app",
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Authentication failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <section className="glass w-full max-w-md rounded-3xl p-7">
        <h1 className="text-2xl font-semibold">
          {mode === "login"
            ? "Welcome back"
            : "Create your account"}
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Your journals will be saved through your private FastAPI backend.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1">
          <button
            type="button"
            onClick={() =>
              setMode("login")
            }
            className={`rounded-xl px-3 py-2 text-sm ${
              mode === "login"
                ? "bg-background shadow"
                : ""
            }`}
          >
            Login
          </button>

          <button
            type="button"
            onClick={() =>
              setMode("register")
            }
            className={`rounded-xl px-3 py-2 text-sm ${
              mode === "register"
                ? "bg-background shadow"
                : ""
            }`}
          >
            Register
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-4"
        >
          {mode === "register" && (
            <div className="space-y-2">
              <Label htmlFor="email">
                Email
              </Label>

              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value,
                  )
                }
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="username">
              Username
            </Label>

            <Input
              id="username"
              required
              minLength={3}
              value={username}
              onChange={(event) =>
                setUsername(
                  event.target.value,
                )
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">
              Password
            </Label>

            <Input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-full"
          >
            {loading
              ? "Please wait..."
              : mode === "login"
                ? "Login"
                : "Register and login"}
          </Button>
        </form>
      </section>
    </main>
  );
}