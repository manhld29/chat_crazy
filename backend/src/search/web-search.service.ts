import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import http from "http";
import https from "https";
import { URL } from "url";

export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

@Injectable()
export class WebSearchService {
  private readonly logger = new Logger(WebSearchService.name);

  constructor(private readonly configService: ConfigService) {}

  async search(query: string, numResults: number = 5): Promise<SearchResult[]> {
    const apiKey = this.configService.get<string>("googleSearchApiKey");
    const cx = this.configService.get<string>("googleSearchCx");

    if (apiKey && cx) {
      try {
        const rawResponse = await this.fetchGoogleCustomSearch(query, apiKey, cx);
        if (rawResponse && Array.isArray(rawResponse.items) && rawResponse.items.length > 0) {
          const formatted = rawResponse.items.slice(0, numResults).map((item: any) => ({
            title: this.cleanText(item.title || "No Title"),
            snippet: this.cleanText(item.snippet || ""),
            url: this.sanitizeUrl(item.link || ""),
          })).filter((res: SearchResult) => res.url !== "");

          if (formatted.length > 0) {
            return formatted;
          }
        }
      } catch (err: any) {
        this.logger.warn(`Google Custom Search API failed: ${err.message}. Falling back to search engine parser.`);
      }
    }

    // Fallback search engine (DuckDuckGo / Scraper)
    try {
      return await this.fallbackSearch(query, numResults);
    } catch (err: any) {
      this.logger.error(`Fallback search also failed: ${err.message}`);
      return [];
    }
  }

  private async fetchGoogleCustomSearch(query: string, apiKey: string, cx: string): Promise<any> {
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(
      apiKey,
    )}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(query)}`;

    const responseText = await this.httpGet(searchUrl);
    return JSON.parse(responseText);
  }

  private async fallbackSearch(query: string, numResults: number = 5): Promise<SearchResult[]> {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const html = await this.httpGet(searchUrl, {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
    });

    const results: SearchResult[] = [];
    
    // Parse DuckDuckGo html result blocks
    // Pattern matches <a class="result__a" href="...">title</a> and snippets in <a class="result__snippet">
    const resultBlockRegex = /<a class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
    
    let match: RegExpExecArray | null;
    while ((match = resultBlockRegex.exec(html)) !== null && results.length < numResults) {
      const rawUrl = match[1];
      const rawTitle = match[2];
      const rawSnippet = match[3];

      let cleanUrl = rawUrl;
      // Handle duckduckgo redirect urls: //duckduckgo.com/l/?uddg=...
      if (rawUrl.includes("uddg=")) {
        try {
          const parsed = new URL("https:" + (rawUrl.startsWith("//") ? rawUrl : "//" + rawUrl));
          const uddg = parsed.searchParams.get("uddg");
          if (uddg) cleanUrl = decodeURIComponent(uddg);
        } catch {
          // ignore
        }
      }

      const sanitizedUrl = this.sanitizeUrl(cleanUrl);
      if (sanitizedUrl) {
        results.push({
          title: this.cleanText(rawTitle),
          snippet: this.cleanText(rawSnippet),
          url: sanitizedUrl,
        });
      }
    }

    return results;
  }

  private httpGet(targetUrl: string, customHeaders: Record<string, string> = {}): Promise<string> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(targetUrl);
      const isHttps = parsedUrl.protocol === "https:";
      const httpLib = isHttps ? https : http;

      const reqOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: "GET",
        headers: {
          "User-Agent": "ChatCrazy-WebSearch/1.0",
          ...customHeaders,
        },
      };

      const req = httpLib.request(reqOptions, (res) => {
        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 400)) {
          reject(new Error(`HTTP error code ${res.statusCode}`));
          return;
        }

        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve(body));
      });

      req.on("error", (err) => reject(err));
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error("HTTP request timeout"));
      });
      req.end();
    });
  }

  private cleanText(raw: string): string {
    return raw
      .replace(/<[^>]*>/g, "") // strip html tags
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();
  }

  private sanitizeUrl(urlStr: string): string {
    if (!urlStr) return "";
    try {
      const parsed = new URL(urlStr);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.toString();
      }
    } catch {
      // Invalid URL
    }
    return "";
  }
}
