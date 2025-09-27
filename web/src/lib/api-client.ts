const DEFAULT_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  params?: Record<string, string | number | boolean | null | undefined>;
  body?: BodyInit | Record<string, unknown> | Array<unknown> | null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> | Array<unknown> {
  if (!value) {
    return false;
  }

  if (typeof value !== "object") {
    return false;
  }

  return !(value instanceof FormData) && !(value instanceof URLSearchParams) && !(value instanceof Blob);
}

export async function apiFetch<T = unknown>(path: string, options: ApiFetchOptions = {}) {
  const { params, headers, body, ...rest } = options;

  const url = new URL(path, DEFAULT_API_BASE_URL.endsWith("/") ? DEFAULT_API_BASE_URL : `${DEFAULT_API_BASE_URL}/`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        return;
      }
      url.searchParams.append(key, String(value));
    });
  }

  const isJsonBody = isPlainObject(body);

  const response = await fetch(url.toString(), {
    ...rest,
    headers: {
      Accept: "application/json",
      ...(isJsonBody ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: isJsonBody ? JSON.stringify(body) : (body as BodyInit | null | undefined),
  });

  if (!response.ok) {
    const text = await response.text();
    const message = text || response.statusText || "Request failed";
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();

  if (!text) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    console.error("Failed to parse JSON response", error);
    return undefined as T;
  }
}
