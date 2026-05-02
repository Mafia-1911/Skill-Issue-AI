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

