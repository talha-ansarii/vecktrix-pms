import Image from "next/image";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-dvh relative flex items-center justify-center p-6">
      <div className="fixed inset-0 z-0">
        <Image src="/bg.avif" alt="" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-bg-dark/70" />
        <div className="glow-spotlight top-1/4 left-1/2 -translate-x-1/2" />
      </div>
      <div className="relative z-10 w-full flex justify-center">
        <LoginForm />
      </div>
    </div>
  );
}
