"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEntityDocumentSearch } from "@/modules/entities/hooks/use-entity-document-search";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { DeveloperApiModal } from "@/modules/developer-examples/components/developer-api-modal";

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function DocumentsSearchCard() {
  const [query, setQuery] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  const { data: results, isLoading } = useEntityDocumentSearch(query, {
    tags: parseTags(tagsInput),
  });

  const developerRequests = [
    {
      title: "List documents",
      method: "GET" as const,
      path: "documents/",
      params: () => {
        const tags = parseTags(tagsInput);
        return {
          search: query.trim() || undefined,
          tags: tags.length ? tags.join(",") : undefined,
        };
      },
      description: "Fetch documents attached to entities. Filter client-side by search text and tags.",
    },
  ];

  return (
    <Card id="search-documents">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>Search entity documents</CardTitle>
          <DeveloperApiModal requests={developerRequests} triggerLabel="View search API" />
        </div>
        <CardDescription>
          Filter briefs, decks, and notes linked to your entities. Leave fields blank to see the latest attachments.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="document-query">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="document-query"
              placeholder="Search by title, content, tag, or entity"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="document-tags">Tags</Label>
          <Input
            id="document-tags"
            placeholder="Comma-separated (e.g. hiring, persona, GTM)"
            value={tagsInput}
            onChange={(event) => setTagsInput(event.target.value)}
          />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-4">
        <div className="text-xs text-muted-foreground">
          Showing {results.length} document{results.length === 1 ? "" : "s"}.
        </div>
        <div className="w-full space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {isLoading && results.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              Loading documents…
            </div>
          ) : null}

          {!isLoading && results.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              No documents found — try another search or attach a brief from an entity.
            </div>
          ) : null}

          {results.map(({ entity, document }) => (
            <div key={document.id} className="rounded-lg border border-border/70 bg-muted/20 p-4 flex flex-col">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>{new Date(document.uploadedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {document.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs uppercase tracking-wide">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <h3 className="mt-2 text-base font-semibold text-foreground">{document.title}</h3>
              <div className="mt-1 line-clamp-2 text-sm text-muted-foreground w-full overflow-hidden">
                <MarkdownRenderer content={document.content.slice(0, 500)} />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <div>
                  Linked to{" "}
                  <Link href={`/entities/${entity.id}`} className="font-medium text-foreground underline-offset-4 hover:underline">
                    {entity.name}
                  </Link>
                </div>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/entities/${entity.id}#documents`}>Open entity</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardFooter>
    </Card>
  );
}
