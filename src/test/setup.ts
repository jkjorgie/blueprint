import "@testing-library/jest-dom/vitest";
import { afterEach, expect } from "vitest";
import { cleanup } from "@testing-library/react";
import { toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

// Unmount rendered components between tests. Testing Library only does this
// automatically when a global afterEach exists, which we do not enable.
afterEach(() => cleanup());
