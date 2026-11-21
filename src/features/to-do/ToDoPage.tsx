import { Link } from "@tanstack/react-router";

export function ToDoPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold">To-do</h1>
      <p className="mt-4">Coming soon</p>
      <nav aria-label="Pages" className="mt-8 flex flex-wrap gap-4">
        <Link
          className="text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
          to="/"
          activeProps={{ "aria-current": "page" }}
        >
          To-do
        </Link>
        <Link
          className="text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
          to="/expenses"
        >
          Expenses
        </Link>
        <Link
          className="text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
          to="/focus"
        >
          Focus
        </Link>
        <Link
          className="text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2"
          to="/real-user-monitoring"
        >
          Real-user monitoring
        </Link>
      </nav>
    </main>
  );
}
