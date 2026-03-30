import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
      <header className="mx-auto max-w-6xl px-4 pb-4 pt-5 md:px-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="shrink-0" aria-label="Go to homepage">
            <img
              src="/logo.png"
              alt="Poll & See"
              className="block h-12 w-auto object-contain md:h-16"
            />
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-xl border border-gray-700 bg-gray-900 px-3 text-sm font-medium text-white transition hover:bg-gray-800 md:px-5"
            >
              Home
            </Link>

            <Link
              href="/submit-poll"
              className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-xl bg-blue-600 px-3 text-sm font-medium text-white transition hover:bg-blue-500 md:px-5"
            >
              Create Poll
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 pb-12 pt-6">
        <div className="rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-lg">
          <h1 className="mb-6 text-3xl font-bold">Terms of Use</h1>

          <div className="space-y-4 text-gray-300">
            <p>Polls must not be defamatory, illegal, or abusive.</p>

            <p>Hate speech is not allowed.</p>

            <p>Impersonation is not allowed.</p>

            <p>Content may be reviewed, edited, moderated, or removed.</p>

            <p>The service is provided on an as-is basis.</p>
          </div>
        </div>
      </section>

      <footer className="py-8 text-center text-sm text-gray-500">
        <div className="mx-auto max-w-6xl px-6">
          <p className="mb-3">
            Poll & See is an online platform for creating and voting on opinion polls across
            business, finance, education, lifestyle and community topics.
          </p>

          <div className="mb-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <Link href="/about" className="hover:text-gray-300">
              About
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
    </main>
  );
}