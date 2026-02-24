import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// --- Mock env ---

vi.mock("../src/config/env.js", () => ({
  requirePinataJWT: vi.fn(() => "test-pinata-jwt"),
}));

// --- Mock fs for file upload ---

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return {
    ...actual,
    readFileSync: vi.fn(() => Buffer.from("fake-file-content")),
  };
});

import {
  uploadFileToPinata,
  uploadJSONToPinata,
  testPinataConnection,
} from "../src/services/pinata.js";

// --- Mock global fetch ---

const mockFetch = vi.fn();

describe("pinata service", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // --- uploadFileToPinata ---

  describe("uploadFileToPinata", () => {
    it("uploads file and returns CID and URLs", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          IpfsHash: "QmTestHash123",
          PinSize: 1234,
          Timestamp: "2026-01-01T00:00:00Z",
        }),
      });

      const result = await uploadFileToPinata("/path/to/image.png");

      expect(result.cid).toBe("QmTestHash123");
      expect(result.uri).toBe("ipfs://QmTestHash123");
      expect(result.gatewayUrl).toBe("https://gateway.pinata.cloud/ipfs/QmTestHash123");
    });

    it("calls Pinata API with correct endpoint", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ IpfsHash: "Qm1", PinSize: 0, Timestamp: "" }),
      });

      await uploadFileToPinata("/path/to/file.txt");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://api.pinata.cloud/pinning/pinFileToIPFS");
      expect(options.method).toBe("POST");
      expect(options.headers.Authorization).toBe("Bearer test-pinata-jwt");
    });

    it("throws on API error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => "Unauthorized",
      });

      await expect(uploadFileToPinata("/path/to/file.txt")).rejects.toThrow(
        "Pinata upload failed (401): Unauthorized"
      );
    });
  });

  // --- uploadJSONToPinata ---

  describe("uploadJSONToPinata", () => {
    it("uploads JSON and returns CID and URLs", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          IpfsHash: "QmJsonHash456",
          PinSize: 567,
          Timestamp: "2026-01-01T00:00:00Z",
        }),
      });

      const metadata = { name: "Test NFT", description: "A test", image: "ipfs://QmImg" };
      const result = await uploadJSONToPinata(metadata, "test-metadata");

      expect(result.cid).toBe("QmJsonHash456");
      expect(result.uri).toBe("ipfs://QmJsonHash456");
      expect(result.gatewayUrl).toBe("https://gateway.pinata.cloud/ipfs/QmJsonHash456");
    });

    it("calls correct API endpoint with JSON content type", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ IpfsHash: "Qm1", PinSize: 0, Timestamp: "" }),
      });

      await uploadJSONToPinata({ key: "value" }, "test");

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://api.pinata.cloud/pinning/pinJSONToIPFS");
      expect(options.headers["Content-Type"]).toBe("application/json");
      expect(options.headers.Authorization).toBe("Bearer test-pinata-jwt");
    });

    it("sends correct body structure", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ IpfsHash: "Qm1", PinSize: 0, Timestamp: "" }),
      });

      const json = { name: "TestNFT" };
      await uploadJSONToPinata(json, "my-nft");

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.pinataContent).toEqual({ name: "TestNFT" });
      expect(body.pinataMetadata).toEqual({ name: "my-nft" });
    });

    it("throws on API error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      });

      await expect(uploadJSONToPinata({}, "fail")).rejects.toThrow(
        "Pinata upload failed (500): Internal Server Error"
      );
    });
  });

  // --- testPinataConnection ---

  describe("testPinataConnection", () => {
    it("returns true on successful auth", async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const result = await testPinataConnection();
      expect(result).toBe(true);
    });

    it("returns false on auth failure", async () => {
      mockFetch.mockResolvedValue({ ok: false });

      const result = await testPinataConnection();
      expect(result).toBe(false);
    });

    it("calls test authentication endpoint", async () => {
      mockFetch.mockResolvedValue({ ok: true });

      await testPinataConnection();

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://api.pinata.cloud/data/testAuthentication");
      expect(options.headers.Authorization).toBe("Bearer test-pinata-jwt");
    });
  });
});
