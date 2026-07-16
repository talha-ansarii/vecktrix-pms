import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AcceptInviteForm } from "./AcceptInviteForm";
import { getInviteByToken } from "@/lib/actions/users";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await getInviteByToken(token);
  if (!invite) notFound();

  return (
    <div className="relative min-h-dvh flex items-center justify-center px-6">
      <Image src="/bg.avif" alt="" fill priority className="object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#030914]/80 via-[#030914]/60 to-[#030914]" />
      <div className="glow-spotlight" />

      <div className="relative z-10 w-full max-w-md card-dark animate-fade-up">
        <div className="flex items-center gap-3 mb-6">
          <Image src="/logo.svg" alt="Vecktrix" width={28} height={28} />
          <span className="font-serif text-xl text-white">Vecktrix PMS</span>
        </div>
        <p className="overline-text text-text-darkSecondary mb-2">Invitation</p>
        <h1 className="heading-card text-white mb-2">Join {invite.workspace.name}</h1>
        <p className="body-text text-text-darkSecondary mb-6">
          You were invited as <span className="text-white">{invite.role.replaceAll("_", " ")}</span>{" "}
          ({invite.email}).
        </p>
        <AcceptInviteForm token={token} email={invite.email} />
        <p className="text-sm text-text-darkSecondary mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-white underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
