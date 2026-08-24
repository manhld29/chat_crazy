"use client";

import React, { useState } from "react";

type MarkdownRendererProps = {
  content: string;
};

const KEYWORDS = new Set([
  "const",
  "let",
  "var",
  "function",
  "return",
  "import",
  "export",
  "from",
  "class",
  "extends",
  "async",
  "await",
  "if",
  "else",
  "switch",
  "case",
  "default",
  "for",
  "while",
  "try",
  "catch",
  "finally",
  "throw",
  "new",
  "typeof",
  "instanceof",
  "interface",
  "type",
  "def",
  "elif",
  "lambda",
  "yield",
  "package",
  "func",
  "struct",
  "SELECT",
  "FROM",
  "WHERE",
  "INSERT",
  "UPDATE",
  "DELETE",
  "JOIN",
  "GROUP",
  "ORDER",
  "BY",
  "as",
  "null",
  "true",
  "false",
  "undefined",
]);

// Accurate syntax-coloring tokenizer for code blocks
function highlightCodeLine(line: string): React.ReactNode {
  if (!line) return "\u00A0";

  // Tokenize comments, strings, words, and symbols
  const tokenRegex = /(\/\/[^\n]*|#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`[^`]*`|\b\w+\b|[^\w\s]+|\s+)/g;
  const parts: React.ReactNode[] = [];
  let match: RegExpExecArray | null;
  let idx = 0;

  while ((match = tokenRegex.exec(line)) !== null) {
    const text = match[0];
    if (!text) continue;

    if (text.startsWith("//") || text.startsWith("#")) {
      parts.push(
        <span key={idx++} className="text-slate-500 italic">
          {text}
        </span>,
      );
    } else if (
      (text.startsWith('"') && text.endsWith('"')) ||
      (text.startsWith("'") && text.endsWith("'")) ||
      (text.startsWith("`") && text.endsWith("`"))
    ) {
      parts.push(
        <span key={idx++} className="text-amber-300">
          {text}
        </span>,
      );
    } else if (KEYWORDS.has(text)) {
      parts.push(
        <span key={idx++} className="text-emerald-400 font-semibold">
          {text}
        </span>,
      );
    } else if (/^\d+(\.\d+)?$/.test(text)) {
      parts.push(
        <span key={idx++} className="text-purple-400">
          {text}
        </span>,
      );
    } else {
      parts.push(<span key={idx++}>{text}</span>);
    }
  }

  return parts.length > 0 ? parts : line;
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const lines = code.split("\n");

  return (
    <div className="my-3 rounded-2xl overflow-hidden border border-slate-700/70 bg-slate-950/90 shadow-xl group">
      {/* Code Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-800 text-xs text-slate-400 select-none">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block"></span>
          </div>
          <span className="font-mono text-[11px] font-semibold text-emerald-400 tracking-wider uppercase ml-1">
            {language || "code"}
          </span>
        </div>

        <button
          onClick={handleCopy}
          aria-label="Sao chép mã"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition-colors border border-slate-700/50"
        >
          {copied ? (
            <>
              <span className="text-emerald-400">✓</span>
              <span className="text-emerald-400">Đã chép!</span>
            </>
          ) : (
            <>
              <span>📋</span>
              <span>Sao chép</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <div className="p-4 overflow-x-auto font-mono text-[12px] leading-relaxed text-slate-200 custom-scrollbar">
        <pre className="m-0">
          <code>
            {lines.map((line, lIdx) => (
              <div key={lIdx} className="table-row">
                <span className="table-cell pr-4 text-right select-none text-slate-600 text-[11px] w-6">
                  {lIdx + 1}
                </span>
                <span className="table-cell whitespace-pre">{highlightCodeLine(line)}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}

// Inline formatting: Bold, Italic, Strikethrough, Inline code, Links
function renderInlineFormatting(text: string): React.ReactNode {
  if (!text) return null;

  const inlineRegex =
    /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(~~[^~]+~~)|(\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\))|(https?:\/\/[^\s\)]+)/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    if (match[1]) {
      const rawCode = match[1].slice(1, -1);
      parts.push(
        <code
          key={`code-${match.index}`}
          className="px-1.5 py-0.5 mx-0.5 rounded-md bg-slate-800 text-emerald-300 font-mono text-[11.5px] border border-slate-700/60"
        >
          {rawCode}
        </code>,
      );
    } else if (match[2]) {
      const boldText = match[2].slice(2, -2);
      parts.push(
        <strong key={`bold-${match.index}`} className="font-bold text-white">
          {boldText}
        </strong>,
      );
    } else if (match[3]) {
      const italicText = match[3].slice(1, -1);
      parts.push(
        <em key={`italic-${match.index}`} className="italic text-slate-300">
          {italicText}
        </em>,
      );
    } else if (match[4]) {
      const strikeText = match[4].slice(2, -2);
      parts.push(
        <del key={`del-${match.index}`} className="line-through text-slate-500">
          {strikeText}
        </del>,
      );
    } else if (match[5]) {
      const label = match[6];
      const url = match[7];
      parts.push(
        <a
          key={`link-${match.index}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-emerald-400 hover:text-emerald-300 underline font-medium transition-colors break-all"
        >
          <span>{label}</span>
          <span className="text-[10px] opacity-75">↗</span>
        </a>,
      );
    } else if (match[8]) {
      const url = match[8];
      parts.push(
        <a
          key={`rawlink-${match.index}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-emerald-400 hover:text-emerald-300 underline font-medium transition-colors break-all"
        >
          <span>{url}</span>
          <span className="text-[10px] opacity-75">↗</span>
        </a>,
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content) return null;

  const blocks: React.ReactNode[] = [];
  const lines = content.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code Block detection
    if (line.trim().startsWith("```")) {
      const language = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // Skip closing ```
      blocks.push(
        <CodeBlock key={`block-code-${blocks.length}`} code={codeLines.join("\n")} language={language} />,
      );
      continue;
    }

    // Headers (#, ##, ###)
    if (line.startsWith("### ")) {
      blocks.push(
        <h3 key={`h3-${i}`} className="text-sm font-bold text-white mt-3 mb-1">
          {renderInlineFormatting(line.slice(4))}
        </h3>,
      );
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(
        <h2 key={`h2-${i}`} className="text-base font-bold text-white mt-4 mb-1.5 border-b border-slate-800 pb-1">
          {renderInlineFormatting(line.slice(3))}
        </h2>,
      );
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push(
        <h1 key={`h1-${i}`} className="text-lg font-extrabold text-white mt-4 mb-2">
          {renderInlineFormatting(line.slice(2))}
        </h1>,
      );
      i++;
      continue;
    }

    // Blockquote (> )
    if (line.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      blocks.push(
        <blockquote
          key={`quote-${i}`}
          className="border-l-4 border-emerald-500/80 bg-slate-900/60 rounded-r-xl px-4 py-2 my-2 text-slate-300 italic text-xs"
        >
          {quoteLines.map((ql, qIdx) => (
            <p key={qIdx} className="m-0">
              {renderInlineFormatting(ql)}
            </p>
          ))}
        </blockquote>,
      );
      continue;
    }

    // Bullet Lists (- or *)
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      const listItems: string[] = [];
      while (
        i < lines.length &&
        (lines[i].trim().startsWith("- ") || lines[i].trim().startsWith("* "))
      ) {
        listItems.push(lines[i].trim().slice(2));
        i++;
      }
      blocks.push(
        <ul key={`ul-${i}`} className="list-disc list-inside space-y-1 my-2 pl-2 text-slate-200 text-xs">
          {listItems.map((item, lIdx) => (
            <li key={lIdx} className="leading-relaxed">
              {renderInlineFormatting(item)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // Numbered Lists (1. )
    if (/^\d+\.\s/.test(line.trim())) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^\d+\.\s/, "");
        listItems.push(itemText);
        i++;
      }
      blocks.push(
        <ol key={`ol-${i}`} className="list-decimal list-inside space-y-1 my-2 pl-2 text-slate-200 text-xs">
          {listItems.map((item, lIdx) => (
            <li key={lIdx} className="leading-relaxed">
              {renderInlineFormatting(item)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    // Markdown Tables (| col 1 | col 2 |)
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headers = tableLines[0]
          .split("|")
          .filter((c, idx, arr) => idx !== 0 && idx !== arr.length - 1)
          .map((c) => c.trim());
        const rows = tableLines
          .slice(2)
          .map((rowStr) =>
            rowStr
              .split("|")
              .filter((c, idx, arr) => idx !== 0 && idx !== arr.length - 1)
              .map((c) => c.trim()),
          );

        blocks.push(
          <div key={`table-${i}`} className="overflow-x-auto my-3 rounded-xl border border-slate-800 bg-slate-950/60 shadow-md">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80">
                  {headers.map((h, hIdx) => (
                    <th key={hIdx} className="p-2.5 font-bold text-emerald-400">
                      {renderInlineFormatting(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="border-b border-slate-800/50 hover:bg-slate-900/40 transition-colors"
                  >
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="p-2.5 text-slate-300">
                        {renderInlineFormatting(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
        );
        continue;
      }
    }

    // Default Paragraph line
    if (line.trim() === "") {
      blocks.push(<div key={`empty-${i}`} className="h-1" />);
    } else {
      blocks.push(
        <div key={`p-${i}`} className="leading-relaxed">
          {renderInlineFormatting(line)}
        </div>,
      );
    }
    i++;
  }

  return <div className="space-y-1 break-words">{blocks}</div>;
}
