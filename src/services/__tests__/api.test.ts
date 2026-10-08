import { normaliseApiUrl } from "../api";

// (jest.mock is hoisted above the imports.)
jest.mock("react-native", () => ({ Platform: { OS: "ios", select: (o: any) => o.ios } }));
jest.mock("@react-native-async-storage/async-storage", () => ({}));
jest.mock("expo-router", () => ({ router: {} }));
jest.mock("../offline/cache", () => ({}));
jest.mock("../offline/seed", () => ({ SEED_EVENTS: [], SEED_SCHEDULE: [], SEED_GENERATED_AT: "" }));
jest.mock("@/utils/fest", () => ({ cleanText: (s: string) => s }));

describe("normaliseApiUrl", () => {
  it.each([
    ["https://api.example.com", "https://api.example.com/api/v1"],
    ["https://api.example.com/", "https://api.example.com/api/v1"],
    ["https://api.example.com/api/v1", "https://api.example.com/api/v1"],
    ["https://api.example.com/api/v1/", "https://api.example.com/api/v1"],
    ["  https://api.example.com  ", "https://api.example.com/api/v1"],
    ["http://localhost:5000/api/v1", "http://localhost:5000/api/v1"],
  ])("%s → %s", (input, expected) => {
    expect(normaliseApiUrl(input)).toBe(expected);
  });
});
