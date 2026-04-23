import Footer from "@/components/Footer";
import SiteHeader from "@/components/SiteHeader";

export default function GuidelinesPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white">
      <SiteHeader />

      <section className="mx-auto max-w-3xl px-6 pb-10 pt-6">
        <div className="rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-lg">
          <h1 className="mb-6 text-3xl font-bold">Poll Guidelines</h1>

          <div className="space-y-6 text-gray-300">
            <p>
              Please keep polls respectful, clear and suitable for a wide audience.
            </p>

            <div>
              <h2 className="mb-2 text-xl font-semibold text-white">Allowed</h2>
              <ul className="list-disc space-y-2 pl-5">
                <li>General opinions</li>
                <li>Everyday topics</li>
                <li>Normal discussion questions</li>
              </ul>
            </div>

            <div>
              <h2 className="mb-2 text-xl font-semibold text-white">Not allowed</h2>
              <ul className="list-disc space-y-2 pl-5">
                <li>Explicit sexual content</li>
                <li>Abusive or hateful content</li>
                <li>Targeting or naming private individuals</li>
                <li>Illegal or harmful content</li>
              </ul>
            </div>

            <p>
              Polls may be edited for clarity or removed if they don’t meet these guidelines.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}