"use client";

const PAYMENT_CONTACT = process.env.NEXT_PUBLIC_BILLING_EMAIL ?? "billing@vecktrix.com";

export function ClientMilestonePaymentBlock({
  milestoneTitle,
  status,
  paymentStatus,
}: {
  milestoneTitle: string;
  status: string;
  paymentStatus: string | null;
}) {
  const paid = paymentStatus === "paid";
  const show =
    status === "completed" || status === "client_approved" || status === "awaiting_client_review";

  if (!show || paid) {
    if (paid) {
      return (
        <p className="mt-3 text-xs text-emerald-400/90 border-t border-white/6 pt-3">
          Payment received for {milestoneTitle}. Next milestone will start when your team enables it.
        </p>
      );
    }
    return null;
  }

  return (
    <div className="mt-3 border-t border-white/6 pt-3 space-y-2">
      <p className="text-sm text-white">Payment for {milestoneTitle}</p>
      <p className="text-xs text-text-darkSecondary">
        Status: {paymentStatus ?? "pending"}. Complete payment so we can unlock the next milestone.
      </p>
      <a href={`mailto:${PAYMENT_CONTACT}?subject=Payment%20—%20${encodeURIComponent(milestoneTitle)}`} className="btn-primary-dark text-xs inline-block px-3 py-1.5">
        Contact us to pay
      </a>
    </div>
  );
}
