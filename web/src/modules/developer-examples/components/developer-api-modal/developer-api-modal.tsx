"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Code } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "WS";

type Serializable = Record<string, unknown> | Array<unknown> | string | number | boolean | null;

type ValueResolver<T> = T | (() => T);

export interface DeveloperApiRequest {
  title: string;
  method: HttpMethod;
  path: string;
  description?: string;
  params?: ValueResolver<Record<string, string | number | boolean | null | undefined>>;
  headers?: ValueResolver<Record<string, string | number | boolean | null | undefined>>;
  body?: ValueResolver<Serializable | undefined>;
  methodLabel?: string;
  codeSamples?: Partial<Record<Language, ValueResolver<string>>>;
}

interface DeveloperApiModalProps {
  requests: DeveloperApiRequest[];
  triggerLabel?: string;
  triggerVariant?: "link" | "outline" | "ghost";
  className?: string;
}

type Language = "curl" | "python" | "javascript" | "go";

interface NormalizedRequest {
  title: string;
  method: HttpMethod;
  methodLabel: string;
  url: string;
  queryString: string;
  fullUrl: string;
  headers: Record<string, string>;
  body?: Serializable;
  description?: string;
  codeSamples?: Partial<Record<Language, string>>;
}

const DEFAULT_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api").replace(/\/$/, "");

const LANGUAGES: { id: Language; label: string }[] = [
  { id: "curl", label: "cURL" },
  { id: "python", label: "Python" },
  { id: "javascript", label: "JavaScript" },
  { id: "go", label: "Go" },
];

export function DeveloperApiModal({
  requests,
  triggerLabel = "View API example",
  triggerVariant = "link",
  className,
}: DeveloperApiModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRequestIndex, setSelectedRequestIndex] = useState(0);
  const [language, setLanguage] = useState<Language>("curl");
  const [isMounted, setIsMounted] = useState(false);

  const normalized = useMemo(() => {
    return requests.map((request) => normalizeRequest(request));
  }, [requests]);

  useEffect(() => {
    if (selectedRequestIndex >= normalized.length) {
      setSelectedRequestIndex(0);
    }
  }, [normalized.length, selectedRequestIndex]);

  const currentRequest = normalized[selectedRequestIndex] ?? normalized[0];

  const codeSample = currentRequest ? buildCodeSample(currentRequest, language) : "";
  const hasRequests = normalized.length > 0;

  useEffect(() => {
    setIsMounted(true);
    return () => {
      setIsMounted(false);
    };
  }, []);

  const modalContent = !isOpen || !hasRequests
    ? null
    : (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-4xl overflow-hidden rounded-xl border border-border/60 bg-card shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="max-h-[calc(100vh-3rem)] overflow-y-auto">
              <div className="flex flex-col gap-6 p-6">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-foreground">API reference</h2>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                      Close
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Mirror the UI action with a REST call. Examples reuse your current field values when available.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {normalized.map((request, index) => {
                      const isActive = index === selectedRequestIndex;
                      return (
                        <button
                          key={`${request.method}-${request.fullUrl}-${index}`}
                          type="button"
                          onClick={() => setSelectedRequestIndex(index)}
                          className={cn(
                            "rounded-md border px-3 py-1 text-xs font-medium transition",
                            isActive
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-muted/40 text-muted-foreground hover:bg-muted/70",
                          )}
                        >
                          <span className="uppercase tracking-wide text-[0.65rem] text-muted-foreground/90">
                            {request.methodLabel}
                          </span>
                          <span className="ml-2 text-xs text-foreground">{request.title}</span>
                        </button>
                      );
                    })}
                  </div>
                  {currentRequest?.description ? (
                    <p className="text-xs text-muted-foreground/80">{currentRequest.description}</p>
                  ) : null}
                  {currentRequest ? (
                    <div className="rounded-lg border border-border/50 bg-muted/30 p-3 text-xs text-muted-foreground">
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-foreground">
                          {currentRequest.methodLabel} {currentRequest.fullUrl}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>

                <Tabs value={language} onValueChange={(value) => setLanguage(value as Language)}>
                  <TabsList className="flex flex-wrap gap-2 bg-muted/40 p-1">
                    {LANGUAGES.map((item) => (
                      <TabsTrigger key={item.id} value={item.id} className="text-xs">
                        {item.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <TabsContent value={language} className="mt-4">
                    <pre className="max-h-[420px] overflow-auto rounded-lg bg-muted/40 p-4 text-xs leading-relaxed text-foreground">
                      <code>{codeSample}</code>
                    </pre>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </div>
      );

  return (
    <>
      <Button
        type="button"
        variant={triggerVariant}
        size="sm"
        onClick={() => hasRequests && setIsOpen(true)}
        disabled={!hasRequests}
        className={cn("gap-1 text-xs", triggerVariant === "link" ? "px-0" : "", className)}
      >
        <Code className="h-3.5 w-3.5" />
        {triggerLabel}
      </Button>

      {isMounted && modalContent ? createPortal(modalContent, document.body) : null}
    </>
  );
}

function normalizeRequest(request: DeveloperApiRequest): NormalizedRequest {
  const params = resolveValue(request.params) ?? {};
  const headers = resolveValue(request.headers) ?? {};
  const body = resolveValue(request.body);

  const sanitizedParams = sanitizeRecord(params);
  const sanitizedHeaders = sanitizeRecord(headers);
  const sanitizedBody = body === undefined ? undefined : sanitizeSerializable(body);

  const baseHeaders: Record<string, string> = {
    Accept: "application/json",
    ...sanitizedHeaders,
  };

  const hasJsonBody = sanitizedBody !== undefined && sanitizedBody !== null && typeof sanitizedBody === "object";

  if (hasJsonBody && !hasHeader(baseHeaders, "content-type")) {
    baseHeaders["Content-Type"] = "application/json";
  }

  const queryString = buildQueryString(sanitizedParams);
  const url = buildUrl(request.path);
  const fullUrl = queryString ? `${url}?${queryString}` : url;

  const codeSamples = request.codeSamples
    ? Object.entries(request.codeSamples).reduce<Partial<Record<Language, string>>>(
        (accumulator, [key, sample]) => {
          const resolved = resolveValue(sample as ValueResolver<string>);
          if (resolved !== undefined) {
            accumulator[key as Language] = resolved;
          }
          return accumulator;
        },
        {},
      )
    : undefined;

  return {
    title: request.title,
    method: request.method,
    methodLabel: request.methodLabel ?? request.method,
    url,
    queryString,
    fullUrl,
    headers: baseHeaders,
    body: sanitizedBody,
    description: request.description,
    codeSamples,
  };
}

function resolveValue<T>(value: ValueResolver<T> | undefined): T | undefined {
  if (typeof value === "function") {
    return (value as () => T)();
  }
  return value;
}

function sanitizeRecord(
  record: Record<string, string | number | boolean | null | undefined>,
): Record<string, string> {
  return Object.entries(record).reduce<Record<string, string>>((accumulator, [key, value]) => {
    if (value === undefined || value === null) {
      return accumulator;
    }

    accumulator[key] = String(value);
    return accumulator;
  }, {});
}

function sanitizeSerializable(value: Serializable): Serializable {
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeSerializable(item as Serializable))
      .filter((item) => item !== undefined) as Serializable;
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>(
      (accumulator, [key, entry]) => {
        if (entry === undefined) {
          return accumulator;
        }
        const sanitized = sanitizeSerializable(entry as Serializable);
        if (sanitized !== undefined) {
          accumulator[key] = sanitized;
        }
        return accumulator;
      },
      {},
    ) as Serializable;
  }

  return value;
}

function hasHeader(headers: Record<string, string>, match: string) {
  return Object.keys(headers).some((key) => key.toLowerCase() === match.toLowerCase());
}

function buildUrl(path: string) {
  if (/^(https?|wss?):\/\//i.test(path)) {
    return path;
  }
  const trimmedPath = path.startsWith("/") ? path.slice(1) : path;
  return `${DEFAULT_BASE_URL}/${trimmedPath}`;
}

function buildQueryString(params: Record<string, string>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === "") {
      return;
    }
    searchParams.append(key, value);
  });
  return searchParams.toString();
}

function buildCodeSample(request: NormalizedRequest, language: Language) {
  const customSample = request.codeSamples?.[language];
  if (customSample) {
    return customSample;
  }

  switch (language) {
    case "python":
      return buildPython(request);
    case "javascript":
      return buildJavaScript(request);
    case "go":
      return buildGo(request);
    case "curl":
    default:
      return buildCurl(request);
  }
}

function buildCurl(request: NormalizedRequest) {
  const segments: string[] = [`curl -X ${request.method} "${request.fullUrl}"`];

  Object.entries(request.headers).forEach(([key, value]) => {
    segments.push(`  -H "${key}: ${escapeDoubleQuotes(value)}"`);
  });

  if (request.body !== undefined) {
    const json = JSON.stringify(request.body, null, 2) ?? "{}";
    const escaped = json.replace(/'/g, "'\"'\"'");
    segments.push(`  --data-raw '${escaped}'`);
  }

  return segments
    .map((segment, index) => (index === segments.length - 1 ? segment : `${segment} \\`))
    .join("\n");
}

function buildPython(request: NormalizedRequest) {
  const hasBody = request.body !== undefined;
  const lines: string[] = [];

  if (hasBody) {
    lines.push("import json");
  }

  lines.push("import requests");
  lines.push("");
  lines.push(`url = "${request.fullUrl}"`);

  const headerEntries = Object.entries(request.headers);
  if (headerEntries.length > 0) {
    lines.push("headers = {");
    headerEntries.forEach(([key, value], index) => {
      const suffix = index === headerEntries.length - 1 ? "" : ",";
      lines.push(`    "${key}": "${escapeDoubleQuotes(value)}"${suffix}`);
    });
    lines.push("}");
  } else {
    lines.push("headers = {}");
  }

  if (hasBody) {
    const payloadJson = JSON.stringify(request.body, null, 2);
    const escapedPayload = payloadJson.replace(/"""/g, '\\"""');
    lines.push('payload = json.loads("""');
    escapedPayload.split("\n").forEach((line) => {
      lines.push(line);
    });
    lines.push('""")');
    lines.push(`response = requests.request("${request.method}", url, headers=headers, json=payload)`);
  } else {
    lines.push(`response = requests.request("${request.method}", url, headers=headers)`);
  }

  lines.push("response.raise_for_status()");
  lines.push("print(response.json())");

  return lines.join("\n");
}

function buildJavaScript(request: NormalizedRequest) {
  const headerEntries = Object.entries(request.headers);
  const lines: string[] = [
    "async function run() {",
    `  const response = await fetch("${request.fullUrl}", {`,
    `    method: "${request.method}",`,
  ];

  const hasBody = request.body !== undefined;

  if (headerEntries.length > 0) {
    lines.push("    headers: {");
    headerEntries.forEach(([key, value], index) => {
      const suffix = index === headerEntries.length - 1 ? "" : ",";
      lines.push(`      "${key}": "${escapeDoubleQuotes(value)}"${suffix}`);
    });
    lines.push(hasBody ? "    }," : "    }");
  } else if (hasBody) {
    lines.push("    headers: {},");
  }

  if (hasBody) {
    const body = JSON.stringify(request.body, null, 2)
      .split("\n")
      .map((line) => `      ${line}`)
      .join("\n");
    lines.push("    body: JSON.stringify(");
    lines.push(body);
    lines.push("    ),");
  }

  lines.push("  });");
  lines.push("  if (!response.ok) {");
  lines.push("    throw new Error(`Request failed: ${response.status}`);");
  lines.push("  }");
  lines.push("  const data = await response.json();");
  lines.push("  console.log(data);");
  lines.push("}");
  lines.push("");
  lines.push("run().catch((error) => console.error(error));");

  return lines.join("\n");
}

function buildGo(request: NormalizedRequest) {
  const hasBody = request.body !== undefined;
  const imports = ["\"fmt\"", "\"io\"", "\"net/http\""];

  if (hasBody) {
    imports.unshift("\"bytes\"");
  }

  const lines: string[] = [
    "package main",
    "",
    "import (",
    ...imports.map((entry) => `  ${entry}`),
    ")",
    "",
    "func main() {",
  ];

  if (hasBody) {
    const minifiedJson = JSON.stringify(request.body ?? {});
    const escaped = minifiedJson.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    lines.push(`  payload := []byte("${escaped}")`);
  }

  const bodyArgument = hasBody ? "bytes.NewBuffer(payload)" : "nil";

  lines.push(
    `  req, err := http.NewRequest("${request.method}", "${request.fullUrl}", ${bodyArgument})`,
  );
  lines.push("  if err != nil {");
  lines.push("    panic(err)");
  lines.push("  }");

  Object.entries(request.headers).forEach(([key, value]) => {
    lines.push(`  req.Header.Set("${key}", "${value}")`);
  });

  lines.push("  resp, err := http.DefaultClient.Do(req)");
  lines.push("  if err != nil {");
  lines.push("    panic(err)");
  lines.push("  }");
  lines.push("  defer resp.Body.Close()");
  lines.push("  bodyBytes, err := io.ReadAll(resp.Body)");
  lines.push("  if err != nil {");
  lines.push("    panic(err)");
  lines.push("  }");
  lines.push("  fmt.Println(string(bodyBytes))");
  lines.push("}");

  return lines.join("\n");
}

function escapeDoubleQuotes(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
