import Link from "next/link";

export default function Footer() {
  return (
    <footer className="pt-4 pb-6 text-center text-sm text-gray-500">
      <div className="mx-auto max-w-6xl px-6">
        <p className="mb-3">
          Create free polls in seconds, share them, and see real opinions instantly. No sign-up required.
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

          <Link href="/advertise" className="hover:text-gray-300">
            Advertise
          </Link>

          <Link href="/add-to-website" className="hover:text-gray-300">
            Add polls to your website
          </Link>
        </div>

        <div className="mt-4 flex flex-col items-center gap-3">
  <a
    href="https://diamantsolutions.co.uk"
    target="_blank"
    rel="noopener noreferrer"
    className="group flex flex-col items-center gap-1 transition hover:opacity-80"
  >
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold text-gray-400">
        Built by
      </span>

      <img
        src="/diamant-solutions-logo.svg"
        alt="Diamant Solutions"
        className="h-6 w-auto"
      />
    </div>

    <span className="text-xs text-gray-400">
      Custom websites, systems & automations.
    </span>

    <span className="text-xs font-semibold text-green-400">
      Want something built?
    </span>
  </a>

  <p>© {new Date().getFullYear()} Poll & See</p>
</div>
      </div>
    </footer>
  );
}