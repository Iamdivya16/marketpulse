import { Suspense } from "react";
import LoginForm from "@/components/auth/login-form";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full flex-1 items-center justify-center px-4 py-16">
          <Skeleton className="h-80 w-full max-w-md" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
