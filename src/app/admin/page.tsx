import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { setAnalystActive } from "@/app/actions/admin";
import { CreateAnalystForm } from "./create-analyst-form";

export const metadata: Metadata = { title: "Administration" };

export default async function AdminPage() {
    await requireUser(["ADMIN"]);

    const analysts = await db.user.findMany({
    where: { role: "ANALYST" },
    orderBy: { name: "asc" },
    select: {
        id: true,
        name: true,
        email: true,
        active: true,
        createdAt: true,
        _count: { select: { applications: true } },
    },
    });

    return (
    <div className="container-page py-12">
        <h1 className="text-3xl">Administration</h1>
        <p className="mt-2 text-ink-muted">
        Manage business analyst accounts and their access to the platform.
        </p>

        <div className="mt-8 overflow-x-auto">
        <table className="w-full">
            <caption className="sr-only">Business analysts</caption>
            <thead>
            <tr className="border-b border-line text-left">
                <th scope="col" className="px-4 py-3">
                Name
                </th>
                <th scope="col" className="px-4 py-3">
                Email
                </th>
                <th scope="col" className="px-4 py-3">
                Applications
                </th>
                <th scope="col" className="px-4 py-3">
                Status
                </th>
                <th scope="col" className="px-4 py-3">
                Actions
                </th>
            </tr>
            </thead>
            <tbody>
            {analysts.map((analyst) => (
                <tr key={analyst.id} className="border-b border-line">
                <td className="px-4 py-3">{analyst.name}</td>
                <td className="px-4 py-3">{analyst.email}</td>
                <td className="px-4 py-3">{analyst._count.applications}</td>
                <td className="px-4 py-3">
                    {analyst.active ? "Active" : "Inactive"}
                </td>
                <td className="px-4 py-3">
                    <form
                    action={setAnalystActive.bind(
                        null,
                        analyst.id,
                        !analyst.active,
                    )}
                    >
                    <button
                        type="submit"
                        className="btn btn-secondary"
                        aria-label={`${analyst.active ? "Deactivate" : "Reactivate"} ${analyst.name}`}
                    >
                        {analyst.active ? "Deactivate" : "Reactivate"}
                    </button>
                    </form>
                </td>
                </tr>
            ))}
            </tbody>
        </table>
        </div>
        <section className="mt-12">
            <h2 className="text-2xl">New analyst</h2>
            <CreateAnalystForm />
        </section>
    </div>
    );
}