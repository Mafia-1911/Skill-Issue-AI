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

