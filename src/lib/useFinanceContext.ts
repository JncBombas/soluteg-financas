"use client";

import { useState, useEffect } from "react";

type ContextType = "PF" | "PJ" | "ALL";

export function useFinanceContext() {
  const [context, setContextState] = useState<ContextType>("ALL");

  useEffect(() => {
    const stored = localStorage.getItem("financeContext") as ContextType;
    if (stored === "PF" || stored === "PJ" || stored === "ALL") {
      setContextState(stored);
    }
  }, []);

  const setContext = (v: ContextType) => {
    setContextState(v);
    localStorage.setItem("financeContext", v);
  };

  return { context, setContext };
}
