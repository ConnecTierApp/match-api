import ReactMarkdown from "react-markdown";

export function MarkdownRenderer({ content }: { content: string }) {
    return (
        <ReactMarkdown
            components={{
                h1: ({ children }) => <h1 className="text-2xl font-semibold text-foreground mb-2 mt-4 first:mt-0">{children}</h1>,
                h2: ({ children }) => <h2 className="text-xl font-semibold text-foreground mb-2 mt-3 first:mt-0">{children}</h2>,
                h3: ({ children }) => <h3 className="text-lg font-semibold text-foreground mb-1 mt-3 first:mt-0">{children}</h3>,
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono text-foreground">{children}</code>,
                pre: ({ children }) => <pre className="bg-muted border rounded p-3 overflow-x-auto text-xs font-mono mb-2">{children}</pre>,
                blockquote: ({ children }) => <blockquote className="border-l-2 border-border pl-4 italic text-muted-foreground mb-2">{children}</blockquote>,
                a: ({ href, children }) => <a href={href} className="text-primary hover:text-primary/80 underline">{children}</a>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="text-muted-foreground/90">{children}</li>,
            }}
        >
            {content}
        </ReactMarkdown>
    )
}