import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page py-24 text-center">
      <h1 className="text-3xl">Page not found</h1>
      <p className="mt-3 text-ink-muted">The page you asked for does not exist or you do not have access to it.</p>
      <Link href="/" className="btn btn-primary mt-8">
        Back to home
      </Link>
    </div>
  );
}
