import { createContext, ReactNode, useContext, useMemo, useState } from "react";

type NamespaceContextValue = {
  namespace: string;
  setNamespace: (value: string) => void;
  userSet: boolean;
  setUserSet: (value: boolean) => void;
};

const NamespaceContext = createContext<NamespaceContextValue | undefined>(undefined);

export function NamespaceProvider({ children }: { children: ReactNode }) {
  const [namespace, setNamespace] = useState("all");
  const [userSet, setUserSet] = useState(false);

  const value = useMemo(
    () => ({ namespace, setNamespace, userSet, setUserSet }),
    [namespace, userSet]
  );

  return <NamespaceContext.Provider value={value}>{children}</NamespaceContext.Provider>;
}

export function useNamespace() {
  const ctx = useContext(NamespaceContext);
  if (!ctx) {
    throw new Error("useNamespace must be used within NamespaceProvider");
  }
  return ctx;
}
