import Link from "next/link";
import Footer from "@/components/Footer";
import SiteHeader from "@/components/SiteHeader";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
      <SiteHeader />

      <section className="mx-auto max-w-3xl px-6 pb-10 pt-6">
        <div className="rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-lg">
          <h1 className="mb-6 text-3xl font-bold">What is Poll & See?</h1>

          <div className="space-y-4 text-gray-300">
            <p>
              Poll & See is a simple way to ask questions and see what people really think.
            </p>

            <p>
              Create a poll in seconds, share the link, and watch results update instantly.
            </p>

            <p>No sign-up required.</p>

           <div className="pt-2">
  <h2 className="mb-3 text-xl font-semibold text-white">How it works</h2>
  <ul className="space-y-2 list-disc pl-5 text-white">
    <li>
      <Link href="/submit-poll" className="text-blue-300 hover:underline">
        Create a poll
      </Link>
    </li>
    <li>Share it</li>
    <li>See live results</li>
  </ul>
</div>

            <div className="pt-2">
              <h2 className="mb-2 text-xl font-semibold text-white">Built for real opinions</h2>
              <p>
                Polls are designed to reflect genuine responses. We use simple safeguards to reduce
                duplicate voting and help keep results fair.
              </p>
            </div>

            <div className="pt-2">
              <h2 className="mb-2 text-xl font-semibold text-white">Use it on your website</h2>
              <p>
                You can add live polls directly to your website so visitors can vote without leaving
                the page. If you'd like to embed a poll on your site, get in touch and we’ll help
                you set it up.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}