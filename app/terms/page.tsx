import Footer from "@/components/Footer";
import SiteHeader from "@/components/SiteHeader";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
      <SiteHeader />

      <section className="mx-auto max-w-3xl px-6 pb-10 pt-6">
        <div className="rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-lg">
          <h1 className="mb-6 text-3xl font-bold">Terms of Use</h1>

          <div className="space-y-4 text-gray-300">
            <p>By using Poll & See, you agree to the following:</p>

            <div className="pt-1">
              <p className="mb-2 text-white">Polls must not include:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Illegal content</li>
                <li>Abusive, harmful or threatening content</li>
                <li>Hate speech</li>
                <li>Impersonation or misleading content</li>
              </ul>
            </div>

            <p>
              We may review, edit or remove any poll to maintain quality, clarity and compliance with these guidelines.
            </p>

            <div className="pt-1">
              <p className="mb-2 text-white">Polls may also be edited for:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Clarity</li>
                <li>Spelling</li>
                <li>Length</li>
                <li>Readability</li>
              </ul>
            </div>

            <p>
              Poll & See is provided as-is. We aim to keep the service reliable and fair, but cannot guarantee uninterrupted access or availability at all times.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}