import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="mx-auto max-w-6xl px-4 pb-4 pt-5 md:px-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex w-full items-center justify-between sm:w-auto sm:block">
          <Link href="/" className="shrink-0" aria-label="Go to homepage">
            <img
              src="/logo.png"
              alt="Poll & See"
              className="block h-12 w-auto object-contain md:h-16"
            />
          </Link>

          <Link
            href="/submit-poll"
            className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-xl bg-blue-600 px-3 text-sm font-medium text-white transition hover:bg-blue-500 sm:hidden"
          >
            Create Poll
          </Link>
        </div>

        <div className="flex w-full shrink-0 items-center justify-center gap-2 sm:w-auto sm:justify-end">
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
            className="hidden h-11 items-center justify-center whitespace-nowrap rounded-xl bg-blue-600 px-3 text-sm font-medium text-white transition hover:bg-blue-500 sm:inline-flex md:px-5"
          >
            Create Poll
          </Link>
        </div>
      </div>
    </header>
  );
}