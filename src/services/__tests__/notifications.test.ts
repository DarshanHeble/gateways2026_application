import { fetchNotifications } from "../notifications";

// (jest.mock is hoisted above the imports.)
// The sheet rows the backend returns, in sheet order; each test sets them.
let mockRows: any[] = [];
let mockStored: any[] = [];

jest.mock("../api", () => ({
  API_BASE_URL: "http://backend.test/api/v1",
  apiClient: jest.fn(async () => ({ data: mockRows })),
}));
jest.mock("../notificationStore", () => ({
  notificationStore: {
    getAll: jest.fn(async () => mockStored),
    replaceAll: jest.fn(async (list: any[]) => {
      mockStored = list;
    }),
  },
}));
jest.mock("../offline/seed", () => ({ SEED_ANNOUNCEMENTS: [] }));
jest.mock("expo-notifications", () => ({}));
jest.mock("expo-constants", () => ({}));
jest.mock("react-native", () => ({ Platform: { OS: "ios" } }));

const row = (n: number, content = `Announcement ${n}`) => ({
  id: `announcement-${n}`,
  sr_no: String(n),
  target: "Everyone",
  content,
  body: content,
  title: `ANNOUNCEMENT #${n}`,
  expiry: "",
});

beforeEach(() => {
  mockRows = [];
  mockStored = [];
});

describe("fetchNotifications ordering", () => {
  it("lists the last sheet row first on a fresh install", async () => {
    mockRows = [row(1), row(2), row(3)];
    const list = await fetchNotifications();
    expect(list.map((n) => n.id)).toEqual(["announcement-3", "announcement-2", "announcement-1"]);
  });

  it("puts a row added later above the ones already seen", async () => {
    mockRows = [row(1), row(2)];
    await fetchNotifications();

    // Later, organisers append row 3.
    await new Promise((r) => setTimeout(r, 5));
    mockRows = [row(1), row(2), row(3)];
    const list = await fetchNotifications();
    expect(list[0].id).toBe("announcement-3");
  });

  it("keeps read state and first-seen time across syncs", async () => {
    mockRows = [row(1)];
    const [first] = await fetchNotifications();
    mockStored = [{ ...first, read: true }];

    const [again] = await fetchNotifications();
    expect(again.read).toBe(true);
    expect(again.createdAt).toBe(first.createdAt);
  });

  it("hides an announcement past its expiry date", async () => {
    mockRows = [{ ...row(1), expiry: "5/10/2020" }, row(2)];
    const list = await fetchNotifications();
    expect(list.map((n) => n.id)).toEqual(["announcement-2"]);
  });
});
