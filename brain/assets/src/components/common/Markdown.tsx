import React from 'react';

// Minimal, safe-ish markdown renderer: supports #/##/###, bullets, bold, and links
// No raw HTML support; only http/https links; rest treated as text.

function isHttpUrl(url: string) {
    try {
        const u = new URL(url);
        return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
        return false;
    }
}

function renderInline(text: string): React.ReactNode[] {
    const nodes: React.ReactNode[] = [];
    const remaining = text;

    // Simple parser for links and bold. Process links first to avoid interfering with bold inside links.
    const linkRegex = /\[(.*?)\]\((.*?)\)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = linkRegex.exec(remaining))) {
        const [full, label, href] = match;
        const start = match.index;
        if (start > lastIndex) {
            nodes.push(applyBold(remaining.slice(lastIndex, start)));
        }
        const safeHref = isHttpUrl(href) ? href : undefined;
        nodes.push(
            <a
                key={`${label}-${start}`}
                href={safeHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline inline-flex items-center gap-1"
                onClick={(e) => {
                    if (!safeHref) e.preventDefault();
                }}
            >
                {label}
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                </svg>
            </a>,
        );
        lastIndex = start + full.length;
    }
    if (lastIndex < remaining.length) {
        nodes.push(applyBold(remaining.slice(lastIndex)));
    }
    return nodes.flat();
}

function applyBold(text: string): React.ReactNode {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={idx}>{part.slice(2, -2)}</strong>;
        }
        return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
}

export default function Markdown({ content }: { content: string }) {
    const lines = content.split('\n');
    const out: React.ReactNode[] = [];
    let listItems: React.ReactNode[] = [];

    const flushList = () => {
        if (listItems.length) {
            out.push(
                <ul key={`ul-${out.length}`} className="ml-4 list-disc">
                    {listItems}
                </ul>,
            );
            listItems = [];
        }
    };

    lines.forEach((line, i) => {
        const trimmed = line.trim();
        if (trimmed === '') {
            flushList();
            out.push(<br key={`br-${i}`} />);
            return;
        }

        if (trimmed.startsWith('# ')) {
            flushList();
            out.push(
                <h1 key={`h1-${i}`} className="mb-4 mt-6 first:mt-0">
                    {trimmed.slice(2)}
                </h1>,
            );
            return;
        }
        if (trimmed.startsWith('## ')) {
            flushList();
            out.push(
                <h2 key={`h2-${i}`} className="mb-3 mt-5 first:mt-0">
                    {trimmed.slice(3)}
                </h2>,
            );
            return;
        }
        if (trimmed.startsWith('### ')) {
            flushList();
            out.push(
                <h3 key={`h3-${i}`} className="mb-2 mt-4 first:mt-0">
                    {trimmed.slice(4)}
                </h3>,
            );
            return;
        }
        if (trimmed.startsWith('- ')) {
            listItems.push(<li key={`li-${i}`}>{renderInline(trimmed.slice(2))}</li>);
            return;
        }
        flushList();
        out.push(
            <p key={`p-${i}`} className="mb-2">
                {renderInline(line)}
            </p>,
        );
    });

    flushList();
    return <div className="prose prose-sm max-w-none">{out}</div>;
}
