import Link from "next/link";

export default function CheckoutHome() {
  return (
    <div className="flex min-h-screen items-center justify-center px-8">
      <div className="w-full max-w-[460px] text-center">
        <h1 className="font-display text-2xl font-bold text-foreground">
          Useroutr Checkout
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This page is not meant to be accessed directly.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          You&apos;ll be redirected here from a payment link or merchant site.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block text-sm font-medium text-primary hover:underline"
        >
          Go back
        </Link>
      </div>
    </div>
  );
}
