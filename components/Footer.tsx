import Link from "next/link";

export default function Footer() {
  return (
    <footer className="pt-4 pb-6 text-center text-sm text-gray-500">
      <div className="mx-auto max-w-6xl px-6">
        <p className="mb-3">
          Create polls in seconds, share them, and see real opinions instantly. No sign-up required.
           </p>

                <div className="mb-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <Link href="/about" className="hover:text-gray-300">
            About
          </Link>
          <Link href="/results" className="hover:text-gray-300">
            Results
          </Link>
          <Link href="/guidelines" className="hover:text-gray-300">
            Guidelines
          </Link>
          <Link href="/privacy" className="hover:text-gray-300">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-gray-300">
            Terms
          </Link>
          <Link href="/contact" className="hover:text-gray-300">
            Contact
          </Link>
        </div>

        <p>© {new Date().getFullYear()} Poll & See</p>
      </div>
    </footer>
  );
}