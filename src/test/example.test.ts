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

describe("NotFound page", () => {
  /**
   * Checks the 404 heading, subtitle, and home-link href are all rendered.
   * Also manually captures console.error to verify the route is logged.
   */
  it("renders 404 UI and logs the attempted route", () => {
    // Capture console.error calls without suppressing them permanently.
    const logged: unknown[][] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => logged.push(args);

    try {
      render(
        React.createElement(MemoryRouter, { initialEntries: ["/bad-path"] },
          React.createElement(NotFound)),
      );

      assertPresent(screen.queryByText("404"), "404 heading");
      assertPresent(screen.queryByText("Oops! Page not found"), "subtitle");

      const link = screen.queryByRole("link", { name: "Return to Home" });
      assertPresent(link, "home link");
      assertEq(link!.getAttribute("href"), "/", "home link href");

      // Walk logged entries to confirm the route error was emitted.
      let found = false;
      for (let i = 0; i < logged.length; i++) {
        if (
          logged[i][0] === "404 Error: User attempted to access non-existent route:" &&
          logged[i][1] === "/bad-path"
        ) {
          found = true;
          break;
        }
      }
      if (!found) throw new Error("Expected console.error with route '/bad-path' was not called");
    } finally {
      console.error = original; // always restore, even if test throws
    }
  });
});

describe("Auth page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState.user = null;
    mockAuthState.loading = false;
    mockSignIn.mockResolvedValue({ error: null });
    mockSignUp.mockResolvedValue({ error: null });
    mockOAuth.mockResolvedValue({ error: null });
    mockResetPasswordForEmail.mockResolvedValue({ error: null });
  });

  /**
   * Walks three mode transitions (login → signup → login → forgot-password)
   * using a loop, asserting the correct action button appears after each click.
   */
  it("navigates between login, signup, and forgot-password modes", async () => {
    render(React.createElement(MemoryRouter, null, React.createElement(Auth)));
    //Asserting Present login mode
    assertPresent(screen.queryByRole("button", { name: "Sign In" }), "default login mode");

    
    const steps: [string, string][] = [
      ["Sign up",          "Create Account"],
      ["Sign in",          "Sign In"],
      ["Forgot password?", "Send Reset Link"],
    ];

    for (let i = 0; i < steps.length; i++) {
      const [click, expect] = steps[i];
      const btn = screen.queryByRole("button", { name: click });
      assertPresent(btn, `nav button "${click}"`);
      fireEvent.click(btn!);
      assertPresent(screen.queryByRole("button", { name: expect }), `action button "${expect}" after step ${i}`);
    }
  });

  /**
   * Simulates a failed login and confirms a destructive toast is shown
   * with the right title, description, and variant.
   */
  it("shows destructive toast on login failure", async () => {
    mockSignIn.mockResolvedValue({ error: { message: "Invalid credentials" } });

    render(React.createElement(MemoryRouter, null, React.createElement(Auth)));
    fireEvent.change(screen.getByLabelText("Email"),    { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      assertCalledWith(
        mockToast,
        (args) => containsSubset(args[0] as Record<string, unknown>, {
          title: "Login failed",
          description: "Invalid credentials",
          variant: "destructive",
        }),
        "destructive toast on login failure",
      );
    });
  });
  
  /**
   * Submits the signup form with a multi-word full name and confirms:
   *   1. signUp is called with the exact three arguments.
   *   2. A "Check your email" success toast appears.
   */
  it("calls signUp with correct args and shows success toast", async () => {
    render(React.createElement(MemoryRouter, null, React.createElement(Auth)));

    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
    fireEvent.change(screen.getByLabelText("Full Name"), { target: { value: "Mary Ann Smith" } });
    fireEvent.change(screen.getByLabelText("Email"),     { target: { value: "mary@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"),  { target: { value: "password123" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    // Verify signUp received the right positional arguments.
    assertCalledWith(
      mockSignUp,
      ([email, password, name]) => email === "mary@example.com" && password === "password123" && name === "Mary Ann Smith",
      "signUp args",
    );

    await waitFor(() => {
      assertCalledWith(
        mockToast,
        (args) => (args[0] as Record<string, unknown>)["title"] === "Check your email",
        "success toast after signup",
      );
    });
  });
});
