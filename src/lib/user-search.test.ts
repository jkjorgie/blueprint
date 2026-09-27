import { describe, expect, it } from "vitest";
import { describeUserMatches, filterUsers } from "./user-search";

const users = [
  { name: "Casey User", email: "user@blueprint.local" },
  { name: "John Doe", email: "john.doe@blueprint.local" },
];

describe("filterUsers", () => {
  it("matches name or email, ignoring case", () => {
    expect(filterUsers(users, "CASEY").map((u) => u.name)).toEqual(["Casey User"]);
    expect(filterUsers(users, "john.doe@").map((u) => u.name)).toEqual(["John Doe"]);
  });

  it("returns everyone for a blank query", () => {
    expect(filterUsers(users, "   ")).toHaveLength(2);
  });
});

describe("describeUserMatches", () => {
  it("words none, one, and many", () => {
    expect(describeUserMatches(0, "x")).toBe("No users match 'x'");
    expect(describeUserMatches(1, "x")).toBe("1 user matches 'x'");
    expect(describeUserMatches(2, "x")).toBe("2 users match 'x'");
  });
});
