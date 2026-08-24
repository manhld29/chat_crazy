import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MarkdownRenderer } from "../MarkdownRenderer";

describe("MarkdownRenderer Component", () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  it("renders simple paragraph text correctly", () => {
    render(<MarkdownRenderer content="Xin chào, đây là tin nhắn thử nghiệm." />);
    expect(screen.getByText("Xin chào, đây là tin nhắn thử nghiệm.")).toBeInTheDocument();
  });

  it("renders bold, italic and inline code formatted text", () => {
    render(
      <MarkdownRenderer content="Đây là **in đậm** và *in nghiêng* cùng với `const a = 1`." />,
    );
    expect(screen.getByText("in đậm")).toBeInTheDocument();
    expect(screen.getByText("in nghiêng")).toBeInTheDocument();
    expect(screen.getByText("const a = 1")).toBeInTheDocument();
  });

  it("renders code blocks with language badge and copy button", async () => {
    const codeSample = "```typescript\nconst greeting: string = 'Hello World';\nconsole.log(greeting);\n```";
    render(<MarkdownRenderer content={codeSample} />);

    expect(screen.getByText("typescript")).toBeInTheDocument();
    expect(screen.getByText("const")).toBeInTheDocument();
    expect(screen.getByText(/'Hello World'/)).toBeInTheDocument();

    const copyBtn = screen.getByRole("button", { name: /sao chép|copy/i });
    expect(copyBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "const greeting: string = 'Hello World';\nconsole.log(greeting);",
    );
    expect(screen.getByText(/đã chép|copied/i)).toBeInTheDocument();
  });

  it("renders markdown links securely with rel='noopener noreferrer'", () => {
    render(
      <MarkdownRenderer content="Xem thêm tại [Google](https://google.com) hoặc https://example.com" />,
    );
    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThanOrEqual(1);
    expect(links[0]).toHaveAttribute("target", "_blank");
    expect(links[0]).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders bullet lists and blockquotes properly", () => {
    const listContent = "- Mục 1: Cấu hình\n- Mục 2: Cài đặt\n\n> Đây là trích dẫn quan trọng";
    render(<MarkdownRenderer content={listContent} />);

    expect(screen.getByText("Mục 1: Cấu hình")).toBeInTheDocument();
    expect(screen.getByText("Mục 2: Cài đặt")).toBeInTheDocument();
    expect(screen.getByText("Đây là trích dẫn quan trọng")).toBeInTheDocument();
  });

  it("sanitizes dangerous script injections and does not execute raw HTML", () => {
    const malicious = '<script>alert("XSS")</script> **An toàn**';
    render(<MarkdownRenderer content={malicious} />);

    expect(screen.queryByText(/alert\("XSS"\)/)).toBeInTheDocument();
    expect(document.querySelector("script")).toBeNull();
  });
});
