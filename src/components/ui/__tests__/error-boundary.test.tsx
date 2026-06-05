// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

import { ErrorBoundary } from "../error-boundary";

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("boom");
  return <div>OK</div>;
}

afterEach(cleanup);

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(screen.queryByText("OK")).not.toBeNull();
  });

  it("renders fallback UI on error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.queryByText("Something went wrong")).not.toBeNull();
    expect(screen.queryByText("boom")).not.toBeNull();
    spy.mockRestore();
  });

  it("accepts a custom fallback", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary fallback={<div>custom fallback</div>}>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.queryByText("custom fallback")).not.toBeNull();
    spy.mockRestore();
  });

  it("try again button resets the boundary", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    let shouldThrow = true;
    // Wrapper reads the mutable variable at render time so the boundary sees the updated value
    function Controlled() {
      return <Bomb shouldThrow={shouldThrow} />;
    }
    render(
      <ErrorBoundary>
        <Controlled />
      </ErrorBoundary>,
    );
    expect(screen.queryByText("Something went wrong")).not.toBeNull();

    shouldThrow = false;
    fireEvent.click(screen.getByText("Try again"));
    expect(screen.queryByText("OK")).not.toBeNull();
    spy.mockRestore();
  });
});
