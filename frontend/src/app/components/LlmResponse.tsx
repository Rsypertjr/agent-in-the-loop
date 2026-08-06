"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface LlmResponseProps {
  content: string; // Raw markdown text returned by your LLM
}

export const LlmResponse: React.FC<LlmResponseProps> = ({ content }) => {
  return (
    <div className="w-full max-w-4xl mx-auto p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
      {/* 
        The 'prose' class forces nested elements (h1, p, ul) to follow clean styles.
        We override it for specific sub-components like code blocks.
      */}
        <div className="prose prose-zinc dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent text-sm">
            <ReactMarkdown
                components={{
                // Customize code block rendering
                code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || "");
                    const codeString = String(children).replace(/\n$/, "");

                    return !inline && match ? (
                    <div className="relative my-4 rounded-lg overflow-hidden border border-zinc-700 shadow-md group">
                        {/* Code Block Header Window Bar */}
                        <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-800 text-zinc-400 text-xs font-mono select-none border-b border-zinc-700/50">
                        <span>{match[1]}</span>
                        <button
                            onClick={() => navigator.clipboard.writeText(codeString)}
                            className="hover:text-white transition-colors cursor-pointer px-2 py-0.5 rounded hover:bg-zinc-700"
                        >
                            Copy
                        </button>
                        </div>
                        {/* Syntax Highlighted Target Code */}
                        <SyntaxHighlighter
                        style={oneDark}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{
                            margin: 0,
                            borderRadius: 0,
                            background: "#18181b", // Matches zinc-900
                            padding: "1rem",
                            fontSize: "0.875rem",
                        }}
                        {...props}
                        >
                        {codeString}
                        </SyntaxHighlighter>
                    </div>
                    ) : (
                    // Inline short code block style (e.g., `const x = 5`)
                    <code
                        className="bg-zinc-100 dark:bg-zinc-800 text-pink-600 dark:text-pink-400 px-1.5 py-0.5 rounded font-mono text-sm before:content-none after:content-none"
                        {...props}
                    >
                        {children}
                    </code>
                    );
                },
                // Format standard markdown anchor links securely
                a({ href, children }) {
                    return (
                    <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 no-underline hover:underline font-medium"
                    >
                        {children}
                    </a>
                    );
                },
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    </div>
  );
};
