import { Link } from "@tanstack/react-router";

const navLinkClassName =
  "inline-flex min-h-6 items-center text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11 [@media(pointer:coarse)]:justify-center";

export function ToDoPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold">To-do</h1>
      <p className="mt-4">Coming soon</p>
      <nav aria-label="Pages" className="mt-8 flex flex-wrap gap-4">
        <Link
          className={navLinkClassName}
          to="/"
          activeProps={{ "aria-current": "page", className: `${navLinkClassName} font-semibold` }}
        >
          To-do
        </Link>
        <Link className={navLinkClassName} to="/expenses">
          Expenses
        </Link>
        <Link className={navLinkClassName} to="/focus">
          Focus
        </Link>
        <Link className={navLinkClassName} to="/real-user-monitoring">
          Real-user monitoring
        </Link>
      </nav>
    </main>
  );
}
