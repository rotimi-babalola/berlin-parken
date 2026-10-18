import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SignalPage } from "@/components/signal/SignalPage";
import { LocationMap } from "@/components/signal/LocationMap";
import { SignalResultsPage } from "@/components/signal/SignalResultsPage";
import { LocaleProvider } from "@/lib/i18n";
import { toEpsg25833 } from "@/lib/parking";
import { defaultArrivalValue } from "@/lib/search-time";
import type { AddressSuggestion } from "@/lib/geocoder/types";

const pushMock = vi.fn();
let searchParamsValue = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => searchParamsValue,
}));
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const suggestions: AddressSuggestion[] = Array.from(
  { length: 6 },
  (_, index) => ({
    id: `street:${index}`,
    label: `Alexanderplatz ${index + 1}`,
    detail: `10178 · Mitte · Berlin`,
    latitude: 52.521 + index / 1000,
    longitude: 13.413 + index / 1000,
  }),
);
const originalScrollIntoView = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "scrollIntoView",
);

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  pushMock.mockClear();
  window.localStorage.clear();
  searchParamsValue = new URLSearchParams();
  if (originalScrollIntoView) {
    Object.defineProperty(
      HTMLElement.prototype,
      "scrollIntoView",
      originalScrollIntoView,
    );
  } else {
    Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
  }
});

function openStreets() {
  fireEvent.click(screen.getByText("01 / STREET INVENTORY"));
}

function openEvents() {
  fireEvent.click(screen.getByText("03 / PLANNED CHANGES"));
}

function stubGeocode() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ suggestions }),
    })),
  );
}

async function fillAndChooseSuggestion() {
  render(<SignalPage />);
  const input = screen.getByRole("combobox", { name: "Destination address" });
  fireEvent.change(input, { target: { value: "Alexanderplatz" } });
  fireEvent.click(
    await screen.findByRole("option", { name: /Alexanderplatz 1/ }),
  );
}

function validResultsParams() {
  return new URLSearchParams({
    label: "Alexanderplatz 1",
    lat: "52.521",
    lon: "13.413",
    radius: "500",
    arrival: defaultArrivalValue(Date.now() + 60 * 60 * 1000),
    duration: "60",
  });
}

describe("SignalPage", () => {
  it("navigates to the results page with the search as URL params", async () => {
    stubGeocode();
    await fillAndChooseSuggestion();
    expect(
      screen
        .getByRole("link", { name: "Berlin Parken home" })
        .getAttribute("href"),
    ).toBe("/");
    expect(screen.queryByRole("link", { name: /Start searching/ })).toBeNull();
    fireEvent.change(screen.getByLabelText("Intended stay"), {
      target: { value: "120" },
    });
    fireEvent.change(screen.getByRole("slider"), { target: { value: 700 } });
    fireEvent.click(
      screen.getByRole("button", { name: "Check nearby streets" }),
    );

    await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(1));
    const url = new URL(pushMock.mock.calls[0][0], "http://localhost");
    expect(url.pathname).toBe("/results");
    expect(url.searchParams.get("label")).toBe("Alexanderplatz 1");
    expect(url.searchParams.get("lat")).toBe("52.521");
    expect(url.searchParams.get("lon")).toBe("13.413");
    expect(url.searchParams.get("radius")).toBe("700");
    expect(url.searchParams.get("duration")).toBe("120");
    expect(
      Number.isFinite(Date.parse(url.searchParams.get("arrival") ?? "")),
    ).toBe(true);
  });

  it("shows an empty recent-searches message on focus without history", async () => {
    stubGeocode();
    render(<SignalPage />);
    const input = screen.getByRole("combobox", { name: "Destination address" });
    fireEvent.focus(input);

    const listbox = await screen.findByRole("listbox");
    await screen.findByText(/No recent searches yet/);
    expect(within(listbox).queryAllByRole("option")).toHaveLength(0);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("records a search and offers it as a recent option on next focus", async () => {
    stubGeocode();
    render(<SignalPage />);
    const input = screen.getByRole("combobox", { name: "Destination address" });
    fireEvent.change(input, { target: { value: "Alexanderplatz" } });
    fireEvent.click(
      await screen.findByRole("option", { name: /Alexanderplatz 1/ }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Check nearby streets" }),
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(1));
    cleanup();

    render(<SignalPage />);
    const again = screen.getByRole("combobox", {
      name: "Destination address",
    });
    fireEvent.focus(again);

    const listbox = await screen.findByRole("listbox");
    expect(
      await within(listbox).findByRole("option", {
        name: /Alexanderplatz 1/,
      }),
    ).toBeTruthy();
    fireEvent.click(
      within(listbox).getByRole("option", { name: /Alexanderplatz 1/ }),
    );
    expect((again as HTMLInputElement).value).toBe("Alexanderplatz 1");
    fireEvent.click(
      screen.getByRole("button", { name: "Check nearby streets" }),
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(2));
    const url = new URL(pushMock.mock.calls[1][0], "http://localhost");
    expect(url.pathname).toBe("/results");
    expect(url.searchParams.get("label")).toBe("Alexanderplatz 1");
  });

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

    render(<SignalPage />);
    const input = screen.getByRole("combobox", { name: "Destination address" });
    fireEvent.change(input, { target: { value: "Alexanderplatz" } });
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));

    expect(document.activeElement).toBe(input);
    await screen.findByRole("option", { name: /Alexanderplatz 1/ });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(requestedUrls[0]).toBe(requestedUrls[1]);
  });

  it("does not select an arbitrary result when Enter is pressed without an active option", async () => {
    stubGeocode();

    render(<SignalPage />);
    const input = screen.getByRole("combobox", { name: "Destination address" });
    fireEvent.change(input, { target: { value: "Alexanderplatz" } });
    await screen.findByRole("option", { name: /Alexanderplatz 1/ });
    fireEvent.keyDown(input, { key: "Enter" });

    expect((input as HTMLInputElement).value).toBe("Alexanderplatz");
    expect(
      within(screen.getByRole("listbox")).getAllByRole("option"),
    ).toHaveLength(6);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("selects the keyboard-highlighted result and scrolls it into view", async () => {
    stubGeocode();
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;

    render(<SignalPage />);
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
    render(<SignalPage />);
    const input = screen.getByRole("combobox", { name: "Destination address" });
    fireEvent.click(
      screen.getByRole("button", { name: "Check nearby streets" }),
    );

    expect(document.activeElement).toBe(input);
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(
      screen.getByText("Select a Berlin address suggestion before continuing."),
    ).toBeTruthy();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("switches the UI to German and persists the choice", async () => {
    window.localStorage.clear();
    render(
      <LocaleProvider>
        <SignalPage />
      </LocaleProvider>,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "DE" })[0]);

    expect(
      await screen.findByRole("button", {
        name: "Straßen in der Nähe prüfen",
      }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Check nearby streets" }),
    ).toBeNull();
    expect(window.localStorage.getItem("berlin-parken-locale")).toBe("de");
  });

  it("blocks navigation when the arrival time is in the past", async () => {
    let parkingRequests = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.startsWith("/api/geocode?"))
          return {
            ok: true,
            json: async () => ({ suggestions: [suggestions[0]] }),
          };
        parkingRequests += 1;
        return { ok: true, json: async () => ({}) };
      }),
    );

    render(<SignalPage />);
    fireEvent.change(
      screen.getByRole("combobox", { name: "Destination address" }),
      { target: { value: "Alexanderplatz" } },
    );
    fireEvent.click(
      await screen.findByRole("option", { name: /Alexanderplatz 1/ }),
    );
    const arrival = screen.getByLabelText("Arrival time") as HTMLInputElement;
    fireEvent.change(arrival, { target: { value: "2000-01-01T10:00" } });
    fireEvent.click(
      screen.getByRole("button", { name: "Check nearby streets" }),
    );

    expect(
      await screen.findByText(
        "Choose a future arrival time within the next 14 days.",
      ),
    ).toBeTruthy();
    expect(arrival.getAttribute("aria-invalid")).toBe("true");
    expect(document.activeElement).toBe(arrival);
    expect(parkingRequests).toBe(0);
    expect(pushMock).not.toHaveBeenCalled();
  });
});

describe("SignalResultsPage", () => {
  const point = toEpsg25833(13.415, 52.522);
  const geometry = {
    type: "Polygon",
    coordinates: [
      [point, [point[0] + 5, point[1]], [point[0], point[1] + 5], point],
    ],
  };

  function stubParking(
    payload: Record<string, unknown>,
    walk?: Record<string, unknown>,
  ) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => ({
        ok: !String(input).startsWith("/api/walk") || Boolean(walk),
        json: async () =>
          String(input).startsWith("/api/walk")
            ? walk
            : {
                status: "available",
                mappedSpaces: 0,
                usableSpaces: 0,
                conditionalSpaces: 0,
                restrictedSpaces: 0,
                unknownSpaces: 0,
                featureCount: 0,
                streets: [],
                candidates: [],
                ...payload,
              },
      })),
    );
  }

  it("renders the supply estimate with a level bar and ranked streets", async () => {
    searchParamsValue = validResultsParams();
    stubParking(
      {
        status: "partial",
        mappedSpaces: 850,
        usableSpaces: 600,
        conditionalSpaces: 150,
        restrictedSpaces: 80,
        unknownSpaces: 20,
        featureCount: 12,
        streets: [
          {
            name: "Torstraße",
            mappedSpaces: 420,
            features: 5,
            nearestMeters: 120,
          },
          {
            name: "Linienstraße",
            mappedSpaces: 310,
            features: 4,
            nearestMeters: 200,
          },
          {
            name: "Gormannstraße",
            mappedSpaces: 190,
            features: 3,
            nearestMeters: 340,
          },
        ],
        candidates: [
          {
            id: "first",
            streetName: "Torstraße",
            usability: "usable",
            mappedSpaces: 20,
            distanceMeters: 120,
            geometry,
          },
          {
            id: "same-street",
            streetName: "Torstraße",
            usability: "usable",
            mappedSpaces: 10,
            distanceMeters: 130,
            geometry,
          },
          {
            id: "backup",
            streetName: "Linienstraße",
            usability: "conditional",
            mappedSpaces: 15,
            distanceMeters: 200,
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  toEpsg25833(13.416, 52.523),
                  toEpsg25833(13.4161, 52.523),
                  toEpsg25833(13.416, 52.5231),
                  toEpsg25833(13.416, 52.523),
                ],
              ],
            },
          },
        ],
      },
      {
        distanceMeters: 260,
        durationMinutes: 4,
        coordinates: [
          [13.415, 52.522],
          [13.413, 52.521],
        ],
      },
    );

    render(<SignalResultsPage />);

    await screen.findByText("WHERE TO LOOK FIRST");
    expect(screen.getByText("First area: Torstraße")).toBeTruthy();
    expect(screen.getByText("Backup area: Linienstraße")).toBeTruthy();
    const map = screen.getByRole("img", {
      name: /First area: Torstraße\. Backup area: Linienstraße/,
    });
    expect(within(map).getByText("Torstraße")).toBeTruthy();
    expect(within(map).getByText("Linienstraße")).toBeTruthy();
    const drivingLinks = screen.getAllByRole("link", {
      name: "Drive to this area ↗",
    });
    expect(drivingLinks).toHaveLength(2);
    const drivingTargets = drivingLinks.map((link) =>
      new URL((link as HTMLAnchorElement).href).searchParams.get("destination"),
    );
    expect(drivingTargets[0]).not.toBe("52.521,13.413");
    expect(drivingTargets[0]).not.toBe(drivingTargets[1]);
    expect(
      screen.getAllByRole("link", {
        name: "Walk from here to the address ↗",
      }),
    ).toHaveLength(2);
    expect(
      await screen.findAllByText(/Walk to address: 260 m · about 4 min/),
    ).toHaveLength(2);
    expect(map.querySelectorAll("polyline")).toHaveLength(2);
    const walkRequests = vi
      .mocked(fetch)
      .mock.calls.map(([input]) => String(input))
      .filter((url) => url.startsWith("/api/walk"));
    expect(walkRequests).toHaveLength(2);
    expect(walkRequests[0]).not.toBe(walkRequests[1]);
    expect(screen.queryByText("First area: Linienstraße")).toBeNull();
    expect(screen.getByText(/Partial parking data/)).toBeTruthy();
    expect(screen.getByText(/20 mapped spaces/)).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Alexanderplatz 1" }),
    ).toBeTruthy();
    openStreets();
    const details = screen
      .getByText("01 / STREET INVENTORY")
      .closest("details") as HTMLElement;
    expect(within(details).getByText("Moderate", { exact: true })).toBeTruthy();
    expect(
      within(details).getByRole("img", {
        name: "Supply estimate Moderate, level 2 of 3",
      }),
    ).toBeTruthy();
    for (const street of ["Torstraße", "Linienstraße", "Gormannstraße"]) {
      expect(within(details).getByText(street)).toBeTruthy();
    }
    expect(
      within(within(details).getByRole("list")).getAllByRole("listitem"),
    ).toHaveLength(3);
    expect(within(details).getByText(/120 m away/)).toBeTruthy();
  });

  it("fits a distant suggestion within the compact location map", () => {
    const far = toEpsg25833(13.413, 52.529);
    render(
      <LocationMap
        longitude={13.413}
        latitude={52.521}
        radiusMeters={1000}
        destination="Alexanderplatz 1"
        areas={[
          {
            id: "far",
            streetName: "Far Street",
            usability: "usable",
            mappedSpaces: 10,
            distanceMeters: 900,
            geometry: {
              type: "Polygon",
              coordinates: [
                [far, [far[0] + 5, far[1]], [far[0], far[1] + 5], far],
              ],
            },
          },
        ]}
      />,
    );

    const map = screen.getByRole("img", { name: /First area: Far Street/ });
    expect(within(map).getByText("Far Street")).toBeTruthy();
    expect(within(map).queryByText("P")).toBeNull();
    const marker = map.querySelector(
      'span[style*="left: calc"]',
    ) as HTMLElement;
    const horizontalOffset = Number(marker.style.left.match(/(-?\d+)px/)?.[1]);
    const verticalOffset = Number(marker.style.top.match(/(-?\d+)px/)?.[1]);
    expect(Math.abs(horizontalOffset)).toBeLessThanOrEqual(100);
    expect(Math.abs(verticalOffset)).toBeLessThanOrEqual(100);
  });

  it("does not show a backup when only one named area exists", async () => {
    searchParamsValue = validResultsParams();
    stubParking({
      status: "available",
      mappedSpaces: 10,
      candidates: [
        {
          id: "only",
          streetName: "Torstraße",
          usability: "usable",
          mappedSpaces: 10,
          distanceMeters: 120,
          geometry,
        },
      ],
    });

    render(<SignalResultsPage />);
    await screen.findByText("First area: Torstraße");
    expect(
      await screen.findByText(/120 m straight line; walking route unavailable/),
    ).toBeTruthy();
    expect(screen.queryByText(/Backup area/)).toBeNull();
  });

  it("distinguishes incomplete data from unnamed eligible areas", async () => {
    searchParamsValue = validResultsParams();
    stubParking({ status: "partial", mappedSpaces: 0 });
    const view = render(<SignalResultsPage />);
    await screen.findByText(/No eligible area in the returned parking data/);
    view.unmount();

    stubParking({
      status: "available",
      mappedSpaces: 10,
      candidates: [
        {
          id: "unnamed",
          usability: "usable",
          mappedSpaces: 10,
          distanceMeters: 120,
          geometry,
        },
      ],
    });
    render(<SignalResultsPage />);
    await screen.findByText(/Eligible mapped parking exists/);
    expect(
      screen.queryByText("No eligible mapped area for this stay."),
    ).toBeNull();
  });

  it("pages through more than five events with the carousel controls", async () => {
    searchParamsValue = validResultsParams();
    stubParking({
      status: "available",
      mappedSpaces: 42,
      usableSpaces: 30,
      conditionalSpaces: 8,
      restrictedSpaces: 4,
      unknownSpaces: 0,
      featureCount: 3,
      streets: [],
      events: {
        source: { status: "available", fetchedAt: new Date().toISOString() },
        items: Array.from({ length: 6 }, (_, index) => ({
          id: `event-${index + 1}`,
          type: `Event ${index + 1}`,
          street: "Torstraße",
          distanceMeters: 50 + index * 10,
        })),
      },
    });

    render(<SignalResultsPage />);

    await screen.findByText("WHERE TO LOOK FIRST");
    openEvents();
    const details = screen
      .getByText("03 / PLANNED CHANGES")
      .closest("details") as HTMLElement;
    await within(details).findByText("1–5 of 6");
    expect(within(details).queryByText("Event 6")).toBeNull();
    expect(
      within(details).getByRole("button", { name: "Show previous events" }),
    ).toHaveProperty("disabled", true);

    fireEvent.click(
      within(details).getByRole("button", { name: "Show next events" }),
    );
    expect(await within(details).findByText("6–6 of 6")).toBeTruthy();
    expect(within(details).getByText("Event 6")).toBeTruthy();
    expect(
      within(details).getByRole("button", { name: "Show next events" }),
    ).toHaveProperty("disabled", true);

    fireEvent.click(
      within(details).getByRole("button", { name: "Show previous events" }),
    );
    expect(await within(details).findByText("1–5 of 6")).toBeTruthy();
    expect(within(details).queryByText("Event 6")).toBeNull();
  });

  it("retries a failed parking request from the results page", async () => {
    searchParamsValue = validResultsParams();
    const parkingUrls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        parkingUrls.push(String(input));
        return parkingUrls.length === 1
          ? { ok: false, json: async () => ({}) }
          : {
              ok: true,
              json: async () => ({
                status: "empty",
                mappedSpaces: 0,
                usableSpaces: 0,
                conditionalSpaces: 0,
                restrictedSpaces: 0,
                unknownSpaces: 0,
                featureCount: 0,
                streets: [],
              }),
            };
      }),
    );

    render(<SignalResultsPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Retry parking search" }),
    );

    await screen.findByText(
      "No mapped parking areas were returned for this radius.",
    );
    expect(parkingUrls).toHaveLength(2);
    expect(parkingUrls[0]).toBe(parkingUrls[1]);
  });

  it("offers a way back when the results link is incomplete", async () => {
    searchParamsValue = new URLSearchParams();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({}) })),
    );

    render(<SignalResultsPage />);

    await screen.findByText(/incomplete/);
    expect(
      screen
        .getByRole("link", { name: "Berlin Parken home" })
        .getAttribute("href"),
    ).toBe("/");
    expect(screen.getByRole("link", { name: "← Home" })).toBeTruthy();
    expect(
      screen.getByRole("combobox", { name: "Destination address" }),
    ).toBeTruthy();
  });

  it("prefills the edit form from the URL and navigates on resubmit", async () => {
    searchParamsValue = validResultsParams();
    stubParking({
      status: "empty",
      mappedSpaces: 0,
      usableSpaces: 0,
      conditionalSpaces: 0,
      restrictedSpaces: 0,
      unknownSpaces: 0,
      featureCount: 0,
      streets: [],
    });

    render(<SignalResultsPage />);
    await screen.findByText(/No mapped parking areas were returned/);

    const address = screen.getByRole("combobox", {
      name: "Destination address",
    }) as HTMLInputElement;
    expect(address.value).toBe("Alexanderplatz 1");
    expect(
      (screen.getByLabelText("Intended stay") as HTMLSelectElement).value,
    ).toBe("60");

    fireEvent.change(screen.getByRole("slider"), { target: { value: 800 } });
    fireEvent.click(
      screen.getByRole("button", { name: "Check nearby streets" }),
    );

    await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(1));
    const url = new URL(pushMock.mock.calls[0][0], "http://localhost");
    expect(url.pathname).toBe("/results");
    expect(url.searchParams.get("label")).toBe("Alexanderplatz 1");
    expect(url.searchParams.get("radius")).toBe("800");
    expect(url.searchParams.get("lat")).toBe("52.521");
    expect(url.searchParams.get("duration")).toBe("60");
  });
});
