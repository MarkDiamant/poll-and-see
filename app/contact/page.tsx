import Link from "next/link";
import Footer from "@/components/Footer";
import SiteHeader from "@/components/SiteHeader";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
      <SiteHeader />

      <section className="mx-auto max-w-3xl px-6 pb-10 pt-6">
        <div className="rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-lg">
          <h1 className="mb-6 text-3xl font-bold">Get in touch</h1>

          <div className="space-y-4 text-gray-300">
            <p>
              For general enquiries, feedback or partnerships:{" "}
              <a href="mailto:hello@pollandsee.com" className="text-blue-300 hover:underline">
                hello@pollandsee.com
              </a>
            </p>

            <p>
              If you want to embed a poll on your website, get in touch and we’ll help you set it
              up.
            </p>

            <p>
              To create a poll, please use the{" "}
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