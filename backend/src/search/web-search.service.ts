import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as http from "http";
import * as https from "https";
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
    const tavilyKey = this.configService.get<string>("tavilyApiKey");
    const tinyfishKey = this.configService.get<string>("tinyfishApiKey");

    // Tier 1: Tavily Search API (High Quality AI Search)
    if (tavilyKey) {
      try {
        const tavilyResults = await this.fetchTavilySearch(
          query,
          tavilyKey,
          numResults,
        );
        if (tavilyResults && tavilyResults.length > 0) {
          return tavilyResults;
        }
      } catch (err: any) {
        this.logger.warn(
          `Tavily Search API failed: ${err.message}. Falling back to next search provider.`,
        );
      }
    }

    // Tier 2: TinyFish Search API
    if (tinyfishKey) {
      try {
        const tfResults = await this.fetchTinyFishSearch(
          query,
          tinyfishKey,
          numResults,
        );
        if (tfResults && tfResults.length > 0) {
          return tfResults;
        }
      } catch (err: any) {
        this.logger.warn(
          `TinyFish Search API failed: ${err.message}. Falling back to DuckDuckGo search.`,
        );
      }
    }

    // Tier 3: DuckDuckGo Lite POST with full browser headers
    try {
      const ddgResults = await this.fallbackSearch(query, numResults);
      if (ddgResults && ddgResults.length > 0) {
        return ddgResults;
      }
    } catch (err: any) {
      this.logger.warn(`DuckDuckGo fallback search failed: ${err.message}`);
    }

    // Tier 4: Wikipedia Open Search API fallback
    try {
      const wikiResults = await this.wikipediaSearch(query, numResults);
      if (wikiResults && wikiResults.length > 0) {
        return wikiResults;
      }
    } catch (err: any) {
      this.logger.warn(`Wikipedia API fallback search failed: ${err.message}`);
    }

    return [];
  }

  private async fetchTavilySearch(
    query: string,
    apiKey: string,
    numResults: number = 5,
  ): Promise<SearchResult[]> {
    const searchUrl = "https://api.tavily.com/search";
    const bodyData = JSON.stringify({
      query,
      max_results: numResults,
    });

    const responseText = await this.httpPostJson(searchUrl, bodyData, {
      Authorization: `Bearer ${apiKey}`,
    });
    const parsed = JSON.parse(responseText);

    if (parsed && Array.isArray(parsed.results)) {
      return parsed.results
        .slice(0, numResults)
        .map((item: any) => ({
          title: this.cleanText(item.title || "Tavily Search Result"),
          snippet: this.cleanText(item.content || item.snippet || ""),
          url: this.sanitizeUrl(item.url || ""),
        }))
        .filter((res: SearchResult) => res.url !== "");
    }
    return [];
  }

  private async fetchTinyFishSearch(
    query: string,
    apiKey: string,
    numResults: number = 5,
  ): Promise<SearchResult[]> {
    const searchUrl = `https://api.search.tinyfish.ai?query=${encodeURIComponent(
      query,
    )}`;
    const responseText = await this.httpGet(searchUrl, {
      "X-API-Key": apiKey,
    });
    const parsed = JSON.parse(responseText);

    if (parsed && Array.isArray(parsed.results)) {
      return parsed.results
        .slice(0, numResults)
        .map((item: any) => ({
          title: this.cleanText(
            item.title || item.site_name || "TinyFish Search",
          ),
          snippet: this.cleanText(item.snippet || ""),
          url: this.sanitizeUrl(item.url || ""),
        }))
        .filter((res: SearchResult) => res.url !== "");
    }
    return [];
  }

  private async fallbackSearch(
    query: string,
    numResults: number = 5,
  ): Promise<SearchResult[]> {
    const searchUrl = "https://lite.duckduckgo.com/lite/";
    const postBody = `q=${encodeURIComponent(query)}`;

    let html = "";
    try {
      html = await this.httpPostForm(searchUrl, postBody, {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        Origin: "https://lite.duckduckgo.com",
        Referer: "https://lite.duckduckgo.com/",
      });
    } catch (err: any) {
      this.logger.warn(`DuckDuckGo Lite POST search failed: ${err.message}.`);
      return [];
    }

    const results: SearchResult[] = [];

    // Parse DuckDuckGo Lite html
    const resultLinkRegex =
      /<a[^>]*class=['"]result-link['"][^>]*>([\s\S]*?)<\/a>/gi;
    const snippetRegex =
      /class=['"]result-snippet['"][^>]*>([\s\S]*?)<\/td>/gi;

    const links: { url: string; title: string }[] = [];
    let linkMatch: RegExpExecArray | null;

    while ((linkMatch = resultLinkRegex.exec(html)) !== null) {
      const fullTag = linkMatch[0];
      const rawTitle = linkMatch[1];
      const hrefMatch = /href=['"]([^'"]+)['"]/i.exec(fullTag);
      let rawUrl = hrefMatch ? hrefMatch[1] : "";

      if (rawUrl.includes("uddg=")) {
        try {
          const parsed = new URL(
            "https:" + (rawUrl.startsWith("//") ? rawUrl : "//" + rawUrl),
          );
          const uddg = parsed.searchParams.get("uddg");
          if (uddg) rawUrl = decodeURIComponent(uddg);
        } catch {
          // ignore
        }
      }

      const sanitizedUrl = this.sanitizeUrl(rawUrl);
      if (sanitizedUrl) {
        links.push({
          url: sanitizedUrl,
          title: this.cleanText(rawTitle),
        });
      }
    }

    const snippets: string[] = [];
    let snippetMatch: RegExpExecArray | null;
    while ((snippetMatch = snippetRegex.exec(html)) !== null) {
      snippets.push(this.cleanText(snippetMatch[1]));
    }

    for (let i = 0; i < Math.min(links.length, numResults); i++) {
      results.push({
        title: links[i].title,
        url: links[i].url,
        snippet: snippets[i] || "",
      });
    }

    return results;
  }

  private async wikipediaSearch(
    query: string,
    numResults: number = 5,
  ): Promise<SearchResult[]> {
    try {
      const searchUrl = `https://vi.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        query,
      )}&utf8=&format=json`;
      const jsonStr = await this.httpGet(searchUrl, {
        "User-Agent": "ChatCrazy-Search/1.0",
      });
      const data = JSON.parse(jsonStr);
      if (data?.query?.search && Array.isArray(data.query.search)) {
        return data.query.search.slice(0, numResults).map((item: any) => ({
          title: this.cleanText(item.title || "Wikipedia"),
          snippet: this.cleanText(item.snippet || ""),
          url: `https://vi.wikipedia.org/wiki/${encodeURIComponent(item.title)}`,
        }));
      }
    } catch (err: any) {
      this.logger.warn(`Wikipedia fallback search failed: ${err.message}`);
    }
    return [];
  }

  private httpGet(
    targetUrl: string,
    customHeaders: Record<string, string> = {},
  ): Promise<string> {
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

  private httpPostJson(
    targetUrl: string,
    jsonData: string,
    customHeaders: Record<string, string> = {},
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(targetUrl);
      const isHttps = parsedUrl.protocol === "https:";
      const httpLib = isHttps ? https : http;

      const reqOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: "POST",
        headers: {
          "User-Agent": "ChatCrazy-WebSearch/1.0",
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(jsonData),
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
      req.write(jsonData);
      req.end();
    });
  }

  private httpPostForm(
    targetUrl: string,
    bodyData: string,
    customHeaders: Record<string, string> = {},
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(targetUrl);
      const isHttps = parsedUrl.protocol === "https:";
      const httpLib = isHttps ? https : http;

      const reqOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: "POST",
        headers: {
          "User-Agent": "ChatCrazy-WebSearch/1.0",
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(bodyData),
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
      req.write(bodyData);
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
