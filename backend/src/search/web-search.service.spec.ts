import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { WebSearchService } from "./web-search.service";

describe("WebSearchService", () => {
  let service: WebSearchService;

  const mockConfigService = {
    get: jest.fn((key: string): any => {
      if (key === "googleSearchApiKey") return "test-api-key";
      if (key === "googleSearchCx") return "test-cx";
      if (key === "tinyfishApiKey") return "test-tinyfish-key";
      if (key === "tavilyApiKey") return "test-tavily-key";
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebSearchService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<WebSearchService>(WebSearchService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("search", () => {
    it("should return formatted search results when Tavily Search API succeeds", async () => {
      mockConfigService.get.mockImplementation((key: string): any => {
        if (key === "tavilyApiKey") return "test-tavily-key";
        return "";
      });

      jest.spyOn(service as any, "fetchTavilySearch").mockResolvedValue([
        {
          title: "Tavily Search Result",
          snippet: "Live AI web access snippet",
          url: "https://tavily.com/result",
        },
      ]);

      const results = await service.search("latest AI news");
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Tavily Search Result");
    });

    it("should return formatted search results when Google Custom Search API succeeds", async () => {
      mockConfigService.get.mockImplementation((key: string): any => {
        if (key === "googleSearchApiKey") return "test-api-key";
        if (key === "googleSearchCx") return "test-cx";
        return "";
      });

      const mockGoogleResponse = {
        items: [
          {
            title: "Hà Nội - Wikipedia",
            snippet: "Hà Nội là thủ đô của Nước Cộng hòa Xã hội Chủ nghĩa Việt Nam...",
            link: "https://vi.wikipedia.org/wiki/H%C3%A0_N%E1%BB%99i",
          },
          {
            title: "Tin tức Hà Nội mới nhất",
            snippet: "Cập nhật tin tức Hà Nội hôm nay...",
            link: "https://hanoimoi.vn",
          },
        ],
      };

      jest.spyOn(service as any, "fetchGoogleCustomSearch").mockResolvedValue(mockGoogleResponse);

      const results = await service.search("Thời tiết Hà Nội");
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        title: "Hà Nội - Wikipedia",
        snippet: "Hà Nội là thủ đô của Nước Cộng hòa Xã hội Chủ nghĩa Việt Nam...",
        url: "https://vi.wikipedia.org/wiki/H%C3%A0_N%E1%BB%99i",
      });
    });

    it("should return TinyFish API search results when Google Search is unconfigured", async () => {
      mockConfigService.get.mockImplementation((key: string): any => {
        if (key === "tinyfishApiKey") return "test-tinyfish-key";
        return "";
      });

      jest.spyOn(service as any, "fetchTinyFishSearch").mockResolvedValue([
        {
          title: "TinyFish Search Result",
          snippet: "Accurate web automation snippet",
          url: "https://tinyfish.ai/result",
        },
      ]);

      const results = await service.search("Thời tiết Hà Nội");
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("TinyFish Search Result");
    });

    it("should fallback gracefully if APIs fail or are unconfigured", async () => {
      mockConfigService.get.mockImplementation((key: string): any => {
        return "";
      });

      jest.spyOn(service as any, "fallbackSearch").mockResolvedValue([
        {
          title: "Thông tin Hà Nội từ Fallback",
          snippet: "Tóm tắt từ tin tức...",
          url: "https://example.com/hanoi",
        },
      ]);

      const results = await service.search("Hà Nội");
      expect(results).toHaveLength(1);
      expect(results[0].title).toContain("Fallback");
    });
  });
});
