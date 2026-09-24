import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AddressSearch } from "@/components/address-search";
import type { AddressSuggestion } from "@/lib/geocoder/types";

const suggestions: AddressSuggestion[] = Array.from({ length: 6 }, (_, index) => ({
  id: `street:${index}`,
  label: `Alexanderplatz ${index + 1}`,
  detail: `10178 · Mitte · Berlin`,
  latitude: 52.521 + index / 1000,
  longitude: 13.413 + index / 1000,
}));
const originalScrollIntoView = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  if (originalScrollIntoView) {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", originalScrollIntoView);
  } else {
    Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
  }
});

describe("AddressSearch", () => {
  it("retries the same query and returns focus to the address field", async () => {
    let requestCount = 0;
    const requestedUrls: string[] = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      requestedUrls.push(String(input));
      requestCount += 1;
      return requestCount === 1
        ? { ok: false, json: async () => ({}) }
        : { ok: true, json: async () => ({ suggestions: [suggestions[0]] }) };
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AddressSearch />);
    const input = screen.getByRole("combobox", { name: "Destination address" });
    fireEvent.change(input, { target: { value: "Alexanderplatz" } });
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));

    expect(document.activeElement).toBe(input);
    await screen.findByRole("option", { name: /Alexanderplatz 1/ });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(requestedUrls[0]).toBe(requestedUrls[1]);
  });

  it("does not select an arbitrary result when Enter is pressed without an active option", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ suggestions }),
    })));

    render(<AddressSearch />);
    const input = screen.getByRole("combobox", { name: "Destination address" });
    fireEvent.change(input, { target: { value: "Alexanderplatz" } });
    await screen.findByRole("option", { name: /Alexanderplatz 1/ });
    fireEvent.keyDown(input, { key: "Enter" });

    expect((input as HTMLInputElement).value).toBe("Alexanderplatz");
    expect(screen.getAllByRole("option")).toHaveLength(6);
    expect(screen.queryByText("Search area set")).toBeNull();
  });

  it("selects the keyboard-highlighted result and scrolls it into view", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ suggestions }),
    })));
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;

    render(<AddressSearch />);
    const input = screen.getByRole("combobox", { name: "Destination address" });
    fireEvent.change(input, { target: { value: "Alexanderplatz" } });
    await screen.findByRole("option", { name: /Alexanderplatz 1/ });
    for (let index = 0; index < 6; index += 1) {
      fireEvent.keyDown(input, { key: "ArrowDown" });
    }

    expect(input.getAttribute("aria-activedescendant")).toContain("option-5");
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect((input as HTMLInputElement).value).toBe("Alexanderplatz 6");
    expect(input.getAttribute("aria-expanded")).toBe("false");
  });

  it("focuses and describes the address field when submitted without a suggestion", () => {
    render(<AddressSearch />);
    const input = screen.getByRole("combobox", { name: "Destination address" });
    fireEvent.click(screen.getByRole("button", { name: "Check nearby streets" }));

    expect(document.activeElement).toBe(input);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Select a Berlin address suggestion before continuing.")).toBeTruthy();
  });

  it("does not replace a newer search result with an older response", async () => {
    type MockResponse = { ok: boolean; json: () => Promise<unknown> };
    const newerSuggestion = { ...suggestions[1], label: "Potsdamer Platz 1" };
    const parkingResponses: Array<(response: MockResponse) => void> = [];
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/geocode?")) {
        const query = new URL(url, "http://localhost").searchParams.get("q");
        return Promise.resolve({
          ok: true,
          json: async () => ({ suggestions: [query === "Alexanderplatz" ? suggestions[0] : newerSuggestion] }),
        });
      }
      return new Promise<MockResponse>((resolve) => parkingResponses.push(resolve));
    }));

    render(<AddressSearch />);
    const input = screen.getByRole("combobox", { name: "Destination address" });
    fireEvent.change(input, { target: { value: "Alexanderplatz" } });
    fireEvent.click(await screen.findByRole("option", { name: /Alexanderplatz 1/ }));
    fireEvent.click(screen.getByRole("button", { name: "Check nearby streets" }));
    await waitFor(() => expect(parkingResponses).toHaveLength(1));

    fireEvent.change(input, { target: { value: "Potsdamer Platz" } });
    fireEvent.click(await screen.findByRole("option", { name: /Potsdamer Platz 1/ }));
    fireEvent.click(screen.getByRole("button", { name: "Check nearby streets" }));
    await waitFor(() => expect(parkingResponses).toHaveLength(2));

    const results = screen.getByRole("region", { name: "Mapped street parking" });
    await act(async () => {
      parkingResponses[1]({ ok: true, json: async () => ({
        status: "available", mappedSpaces: 22, usableSpaces: 22, conditionalSpaces: 0,
        restrictedSpaces: 0, unknownSpaces: 0, featureCount: 1, streets: [],
      }) });
    });
    expect(within(results).getByText("22", { selector: "p" })).toBeTruthy();

    await act(async () => {
      parkingResponses[0]({ ok: true, json: async () => ({
        status: "available", mappedSpaces: 11, usableSpaces: 11, conditionalSpaces: 0,
        restrictedSpaces: 0, unknownSpaces: 0, featureCount: 1, streets: [],
      }) });
    });

    expect(within(results).getByText(/Potsdamer Platz 1/)).toBeTruthy();
    expect(within(results).getByText("22", { selector: "p" })).toBeTruthy();
    expect(within(results).queryByText("11", { selector: "p" })).toBeNull();
  });
});
