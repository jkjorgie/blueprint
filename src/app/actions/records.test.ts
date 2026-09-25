// Security tests for response update/delete actions.
// These verify that a response ID must belong to the application being accessed.

import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    requireUser,
    getAppForUser,
    findFirst,
    update,
    deleteRecord,
} = vi.hoisted(() => ({
    requireUser: vi.fn(),
    getAppForUser: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    deleteRecord: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ requireUser }));

vi.mock("@/lib/apps", () => ({ getAppForUser }));

vi.mock("@/lib/db", () => ({
    db: {
    dataRecord: {
        findFirst,
        update,
        delete: deleteRecord,
    },
    },
}));

import { updateRecord, deleteRecord as deleteResponse } from "./records";

const user = { id: "user-1" };

const app = {
    id: "app-1",
    schema: {
    title: "Bug Reports",
    fields: [
        {
        name: "title",
        label: "Title",
        type: "text",
        required: true,
        },
    ],
    },
    archived: false,
};

describe("response server actions", () => {
    beforeEach(() => {
    vi.clearAllMocks();

    requireUser.mockResolvedValue(user);
    getAppForUser.mockResolvedValue(app);
    });

    it("refuses to update a response from another application", async () => {
    findFirst.mockResolvedValue(null);

    const formData = new FormData();
    formData.set("title", "Changed");

    const result = await updateRecord(
        "app-1",
        "response-from-other-app",
        {},
        formData,
    );

    expect(result).toEqual({ formError: "Response not found." });
    expect(update).not.toHaveBeenCalled();
    });

    it("refuses to delete a response from another application", async () => {
    findFirst.mockResolvedValue(null);

    await deleteResponse("app-1", "response-from-other-app");

    expect(deleteRecord).not.toHaveBeenCalled();
    });
});
