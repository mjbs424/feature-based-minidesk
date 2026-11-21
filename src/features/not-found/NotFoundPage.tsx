import { Link } from "@tanstack/react-router";

export function NotFoundPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p className="mt-4">We could not find the page you requested.</p>
      <Link
        className="mt-8 inline-block text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
        to="/"
      >
        Back to To-do
      </Link>
    </main>
  );
}
