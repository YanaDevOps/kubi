import { createContext, ReactNode, useContext, useMemo, useState } from "react";

type SearchContextValue = {
  query: string;
  setQuery: (value: string) => void;
  labelSelector: string;
  setLabelSelector: (value: string) => void;
};

const SearchContext = createContext<SearchContextValue | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [labelSelector, setLabelSelector] = useState("");

  const value = useMemo(
    () => ({ query, setQuery, labelSelector, setLabelSelector }),
    [query, labelSelector]
  );

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) {
    throw new Error("useSearch must be used within SearchProvider");
  }
  return ctx;
}
