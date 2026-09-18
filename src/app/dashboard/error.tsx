"use client";

import Link from "next/link";

export default function Error({
    error,
    reset,
}: {
    error: Error;
    reset: () => void;
}) {
    console.error(error);

    return (
        <div className="container-page">
        <h1>Something went wrong</h1>
        <p className="text-ink-muted">
        The dashboard could not load.
        </p>
        <div className="mt-4 flex gap-3">
            <button
            type="button"
            onClick={() => reset()}
            className="btn btn-primary"
            >
            Try again
            </button>
            <Link href="/" className="btn btn-secondary">
                Back to home
            </Link>
        </div>
    </div>
    );
}
