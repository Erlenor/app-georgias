"use client";

interface Props {
    content: string;
}

// Simple markdown renderer — no external deps needed
export default function MarkdownRenderer({ content }: Props) {
    const lines = content.split("\n");
    const elements: React.ReactNode[] = [];
    let key = 0;
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        // H1
        if (line.startsWith("# ")) {
            elements.push(
                <h1 key={key++} className="text-2xl font-bold text-white mt-8 mb-4 pb-2 border-b border-slate-700">
                    {line.slice(2)}
                </h1>
            );
        }
        // H2
        else if (line.startsWith("## ")) {
            elements.push(
                <h2 key={key++} className="text-xl font-semibold text-white mt-6 mb-3">
                    {line.slice(3)}
                </h2>
            );
        }
        // H3
        else if (line.startsWith("### ")) {
            elements.push(
                <h3 key={key++} className="text-lg font-semibold text-emerald-400 mt-5 mb-2">
                    {line.slice(4)}
                </h3>
            );
        }
        // Horizontal rule
        else if (line.startsWith("---") || line.startsWith("***")) {
            elements.push(
                <hr key={key++} className="border-slate-700 my-6" />
            );
        }
        // Bullet list
        else if (line.startsWith("- ") || line.startsWith("* ")) {
            const items: string[] = [];
            while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* "))) {
                items.push(lines[i].slice(2));
                i++;
            }
            elements.push(
                <ul key={key++} className="list-disc list-inside space-y-1 my-3 text-slate-300">
                    {items.map((item, idx) => (
                        <li key={idx} className="text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
                    ))}
                </ul>
            );
            continue;
        }
        // Numbered list
        else if (/^\d+\. /.test(line)) {
            const items: string[] = [];
            while (i < lines.length && /^\d+\. /.test(lines[i])) {
                items.push(lines[i].replace(/^\d+\. /, ""));
                i++;
            }
            elements.push(
                <ol key={key++} className="list-decimal list-inside space-y-1 my-3">
                    {items.map((item, idx) => (
                        <li key={idx} className="text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
                    ))}
                </ol>
            );
            continue;
        }
        // Blockquote
        else if (line.startsWith("> ")) {
            elements.push(
                <blockquote key={key++} className="border-l-4 border-emerald-500 pl-4 my-4 italic text-slate-400">
                    {line.slice(2)}
                </blockquote>
            );
        }
        // Empty line — spacer
        else if (line.trim() === "") {
            elements.push(<div key={key++} className="h-2" />);
        }
        // Regular paragraph
        else {
            elements.push(
                <p key={key++} className="text-slate-300 leading-relaxed my-2"
                   dangerouslySetInnerHTML={{ __html: inlineFormat(line) }}
                />
            );
        }
        i++;
    }

    return (
        <div className="prose-custom">
            {elements}
        </div>
    );
}

// Handle bold, italic, inline code
function inlineFormat(text: string): string {
    return text
        .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
        .replace(/\*(.+?)\*/g, '<em class="italic text-slate-200">$1</em>')
        .replace(/`(.+?)`/g, '<code class="bg-slate-800 text-emerald-400 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>');
}