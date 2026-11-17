"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// One filter: its default (never written to the URL) and, optionally, the values a URL may carry.
export type FilterConfig = Record<string, { default: string; values?: readonly string[] }>;

export type ListParams = { q: string; page: number; filters: Record<string, string> };

// Reads ?q=&page=&<filter>= from the URL; unknown filter values and bad page numbers fall back to the default.
export const parseListParams = (sp: URLSearchParams, config: FilterConfig): ListParams => {
  const filters: Record<string, string> = {};
  for (const [key, { default: def, values }] of Object.entries(config)) {
    const raw = sp.get(key);
    filters[key] = raw !== null && (!values || values.includes(raw)) ? raw : def;
  }
  const page = Number.parseInt(sp.get("page") ?? "", 10);
  return { q: sp.get("q") ?? "", page: Number.isInteger(page) && page > 0 ? page : 1, filters };
};

// Builds the query string for a state, leaving out defaults so clean URLs stay clean.
export const buildListQuery = (state: ListParams, config: FilterConfig) => {
  const sp = new URLSearchParams();
  if (state.q) sp.set("q", state.q);
  for (const [key, { default: def }] of Object.entries(config)) {
    if (state.filters[key] !== def) sp.set(key, state.filters[key]);
  }
  if (state.page > 1) sp.set("page", String(state.page));
  return sp.toString();
};

// Next state after changing one filter: the filter is set and the page goes back to 1.
export const withFilter = (state: ListParams, key: string, value: string): ListParams => ({
  ...state,
  filters: { ...state.filters, [key]: value },
  page: 1,
});

/**
 * Search, filters and page for a list screen, kept in the URL (shareable, survives reload).
 * Search is debounced 300ms before it reaches the URL; any filter or search change resets page to 1.
 * @param config Each filter's default and accepted values (declare it outside the component).
 */
export const useUrlListParams = (config: FilterConfig) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = parseListParams(new URLSearchParams(searchParams.toString()), config);

  // Text in the search box right now; lags the URL by the debounce delay.
  const [searchInput, setSearchInput] = useState(params.q);

  const write = useCallback(
    (next: ListParams) => {
      const qs = buildListQuery(next, config);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, config],
  );

  // Latest params for the debounce timer, so it never writes a stale filter/page.
  const latest = useRef(params);
  useEffect(() => {
    latest.current = params;
  });

  useEffect(() => {
    if (searchInput === latest.current.q) return;
    const timer = setTimeout(() => write({ ...latest.current, q: searchInput, page: 1 }), 300);
    return () => clearTimeout(timer);
  }, [searchInput, write]);

  const setFilter = (key: string, value: string) => write(withFilter(params, key, value));
  const setPage = (page: number) => write({ ...params, page });
  const clearFilters = () => {
    setSearchInput("");
    write({ q: "", page: 1, filters: Object.fromEntries(Object.entries(config).map(([k, v]) => [k, v.default])) });
  };
  const hasActiveFilters = !!params.q || Object.entries(config).some(([key, { default: def }]) => params.filters[key] !== def);

  return { ...params, searchInput, setSearchInput, setFilter, setPage, clearFilters, hasActiveFilters };
};
