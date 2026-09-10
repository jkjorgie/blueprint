import Link from "next/link";

const audiences = [
  {
    heading: "Business analysts",
    body: "Describe your table in JSON, publish it, and hand your team a working app without writing any code.",
  },
  {
    heading: "End users",
    body: "Add and browse records through generated forms and lists that work with a keyboard and a screen reader.",
  },
  {
    heading: "Administrators",
    body: "Create analyst accounts and keep every analyst's workspace isolated from the others.",
  },
];

export default function HomePage() {
  return (
    <div className="container-page py-16 sm:py-24">
      <section aria-labelledby="hero-heading" className="max-w-2xl">
        <h1 id="hero-heading" className="text-4xl sm:text-5xl">
          From table definition to working app.
        </h1>
        <p className="mt-6 text-lg text-ink-muted">
          Blueprint reads a JSON description of your fields and renders create and edit forms, validation,
          and a searchable list view, all built to WCAG 2.1 AA.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/sign-in" className="btn btn-primary">
            Sign in
          </Link>
          <Link href="/dashboard" className="btn btn-secondary">
            Go to dashboard
          </Link>
        </div>
      </section>

      <section aria-labelledby="audiences-heading" className="mt-20">
        <h2 id="audiences-heading" className="text-2xl">
          Built for three kinds of people
        </h2>
        <ul className="mt-6 grid gap-6 sm:grid-cols-3">
          {audiences.map((audience) => (
            <li key={audience.heading} className="card">
              <h3 className="text-lg">{audience.heading}</h3>
              <p className="mt-2 text-ink-muted">{audience.body}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
