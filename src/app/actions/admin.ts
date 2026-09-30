"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

export async function setAnalystActive(userId: string, active: boolean) {
    await requireUser(["ADMIN"]);

    await db.user.updateMany({
    where: {
        id: userId,
        role: "ANALYST",
    },
    data: {
        active,
    },
    });

    revalidatePath("/admin");
}