import React from "react";
import { beforeEach, describe, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { cn } from "@/lib/utils";
import NotFound from "@/pages/NotFound";
import Auth from "@/pages/Auth";
// ─── Simulating Mock states for testing ───────────────────────────────────────
const { mockSignIn, mockSignUp, mockToast, mockOAuth, mockResetPasswordForEmail, mockAuthState } =
  vi.hoisted(() => ({
    mockSignIn: vi.fn(),
    mockSignUp: vi.fn(),
    mockToast: vi.fn(),
    mockOAuth: vi.fn(),
    mockResetPasswordForEmail: vi.fn(),
    mockAuthState: { user: null as unknown, loading: false },
  }));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) =>
      React.createElement("div", props, children),
    form: ({ children, ...props }: React.FormHTMLAttributes<HTMLFormElement>) =>
      React.createElement("form", props, children),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: mockAuthState.user, loading: mockAuthState.loading, signIn: mockSignIn, signUp: mockSignUp }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { signInWithOAuth: mockOAuth, resetPasswordForEmail: mockResetPasswordForEmail } },
}));


/**
 * Throws if actual !== expected.
 */
function assertEq(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) {
    throw new Error(`[${label}] Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

/**
 * Throws if element is null/undefined (i.e. not in the DOM).
 */
function assertPresent(el: Element | null | undefined, label: string): void {
  if (el == null) throw new Error(`[${label}] Expected element to be in the DOM`);
}

/**
 * Loops over every recorded mock call; throws if none satisfy the predicate.
 * On failure, dumps all recorded calls so the diff is immediately visible.
 */
function assertCalledWith(fn: ReturnType<typeof vi.fn>, predicate: (args: unknown[]) => boolean, label: string): void {
  for (let i = 0; i < fn.mock.calls.length; i++) {
    if (predicate(fn.mock.calls[i])) return; // found a matching call — pass
  }
  const dump = fn.mock.calls.map((c, i) => `  [${i}] ${JSON.stringify(c)}`).join("\n");
  throw new Error(`[${label}] No call matched predicate. Calls:\n${dump}`);
}

/**
 * Returns true when every key in `subset` matches the same key in `obj`.
 * Used inside assertCalledWith predicates to do partial-object checks.
 */
function containsSubset(obj: Record<string, unknown>, subset: Record<string, unknown>): boolean {
  const keys = Object.keys(subset);
  for (let k = 0; k < keys.length; k++) {
    if (obj[keys[k]] !== subset[keys[k]]) return false;
  }
  return true;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("utils: cn", () => {
  /**
   * checkBoundaryValues — runs cn() against every boundary case in the table
   * and throws the moment any output doesn't match its expected value.
   *
   * A "boundary value" here means an input at the extreme edge of what cn()
   * must handle: completely empty, only-falsy, a single token, a very long
   * chain, and tokens that contain spaces. These are the values most likely
   * to expose off-by-one errors or silent type coercions inside the utility.
   *
   * How it works:
   *   1. Build a cases table — each row is [label, inputs[], expectedOutput].
   *   2. Loop over every row with a plain for-loop.
   *   3. Call cn(...inputs) and compare with assertEq.
   *   4. Any mismatch throws immediately, surfacing the failing label.
   */
  it("boundary values: empty, falsy-only, single, spaced, and long inputs", () => {
    function checkBoundaryValues(): void {
      const cases: [string, Parameters<typeof cn>, string][] = [
        // ── below-minimum boundary: no tokens at all ──────────────────
        ["empty call",        [],                                             ""],
        // ── boundary: only falsy tokens, nothing valid should survive ──
        ["only falsy",        [null as never, false as never, undefined],     ""],
        // ── exact-minimum valid boundary: one real token ───────────────
        ["single token",      ["solo"],                                       "solo"],
        // ── tokens that contain internal spaces must pass through as-is ─
        ["spaced token",      ["first", "last name", "active"],               "first last name active"],
        // ── falsy values mixed in between valid tokens ─────────────────
        ["falsy mixed in",    ["base", null as never, false as never, "tail"],"base tail"],
        // ── upper boundary: many tokens joined without extra whitespace ──
        ["long chain",        ["a","b","c","d","e","f","g","h","i","j"],      "a b c d e f g h i j"],
      ];

      for (let i = 0; i < cases.length; i++) {
        const [label, inputs, expected] = cases[i];
        assertEq(cn(...inputs), expected, `cn boundary — ${label}`);
      }
    }

    checkBoundaryValues();
  });
});
