import Link from "next/link";
import Footer from "@/components/Footer";

export default function AboutPage() {
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
              href="/results"
              className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-xl border border-gray-700 bg-gray-900 px-3 text-sm font-medium text-white transition hover:bg-gray-800 md:px-5"
            >
              Results
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

      <section className="mx-auto max-w-3xl px-6 pb-10 pt-6">
        <div className="rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-lg">
          <h1 className="mb-6 text-3xl font-bold">About</h1>

          <div className="space-y-4 text-gray-300">
            <p>
              Poll & See is a simple platform for creating and voting on opinion polls across
              business, finance, education, lifestyle and community topics.
            </p>

            <p>Our goal is to make it easy to see what people really think.</p>

            <p>
              Users can create a poll in seconds, share the link, and watch results come in live.
            </p>

            <div className="pt-2">
              <h2 className="mb-2 text-xl font-semibold text-white">Trust</h2>
              <p>
                Poll & See shows live results from real users. Votes are counted individually and update instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}