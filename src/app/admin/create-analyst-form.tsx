"use client";

import { useActionState } from "react";
import {
    createAnalyst,
    type CreateAnalystState,
} from "@/app/actions/admin";

const initialState: CreateAnalystState = {};

export function CreateAnalystForm() {
    const [state, formAction, pending] = useActionState(
    createAnalyst,
    initialState,
    );

    return (
    <form action={formAction} className="mt-6 max-w-xl space-y-6">
        <div>
        <label htmlFor="name" className="block font-medium">
            Name
        </label>
        <input
            id="name"
            name="name"
            type="text"
            required
            className="mt-2 w-full rounded border border-line px-3 py-2"
        />
        </div>

        <div>
        <label htmlFor="email" className="block font-medium">
            Email
        </label>
        <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-2 w-full rounded border border-line px-3 py-2"
        />
        </div>

        <div>
        <label htmlFor="temporaryPassword" className="block font-medium">
            Temporary password
        </label>
        <input
            id="temporaryPassword"
            name="temporaryPassword"
            type="password"
            minLength={12}
            required
            className="mt-2 w-full rounded border border-line px-3 py-2"
            aria-describedby="temporary-password-hint"
        />
        <p
            id="temporary-password-hint"
            className="mt-2 text-sm text-ink-muted"
        >
            Must be at least 12 characters. Give this temporary password directly
            to the analyst.
        </p>
        </div>

        {state.error && (
        <p role="alert" className="text-red-700">
            {state.error}
        </p>
        )}

        {state.success && state.name && (
        <p role="status" className="text-green-700">
            Analyst account created for {state.name}.
        </p>
        )}

        <button
        type="submit"
        className="btn btn-primary"
        disabled={pending}
        >
        {pending ? "Creating..." : "Create analyst"}
        </button>
    </form>
    );
}
