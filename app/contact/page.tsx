import Link from "next/link";
import Footer from "@/components/Footer";

export default function ContactPage() {
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

      <section className="mx-auto max-w-3xl px-6 pb-10 pt-6">
        <div className="rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-lg">
          <h1 className="mb-6 text-3xl font-bold">Contact</h1>

          <div className="space-y-4 text-gray-300">
            <p>
              For enquiries:{" "}
              <a href="mailto:hello@pollandsee.com" className="text-blue-300 hover:underline">
                hello@pollandsee.com
              </a>
            </p>

            <p>
              For poll submissions, please use the{" "}
              <Link href="/submit-poll" className="text-blue-300 hover:underline">
                Create Poll
              </Link>{" "}
              page.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}