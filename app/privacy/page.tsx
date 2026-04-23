import Footer from "@/components/Footer";
import SiteHeader from "@/components/SiteHeader";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
      <SiteHeader />

      <section className="mx-auto max-w-3xl px-6 pb-10 pt-6">
        <div className="rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-lg">
          <h1 className="mb-6 text-3xl font-bold">Privacy Policy</h1>

          <div className="space-y-4 text-gray-300">
            <p>Poll & See is designed to be simple and privacy-friendly.</p>

            <p>No account is required to create or vote on polls.</p>

            <p>Voting is designed to be anonymous.</p>

            <p>
              We use limited technical signals, such as IP-based checks, to help reduce duplicate
              voting and keep results fair.
            </p>

            <p>
              These signals are used only to maintain the integrity of polls. They are not used to
              identify individuals.
            </p>

            <p>
              If you subscribe, your email address is used only to send poll updates. You can
              unsubscribe at any time.
            </p>

            <p>We do not sell subscriber data or personal information.</p>

            <p>We may use basic analytics to understand usage and improve the service.</p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}