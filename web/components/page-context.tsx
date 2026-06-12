"use client";

import React, { createContext, useContext, useState } from "react";

export type AiMode = "groq-online" | "gemini-offline";

type PageContextType = {
  pageData: any;
  setPageData: (data: any) => void;
  aiMode: AiMode;
  setAiMode: (mode: AiMode) => void;
};

const PageContext = createContext<PageContextType | undefined>(undefined);

export function PageContextProvider({ children }: { children: React.ReactNode }) {
  const [pageData, setPageData] = useState<any>(null);
  const [aiMode, setAiMode] = useState<AiMode>("groq-online");

  return (
    <PageContext.Provider value={{ pageData, setPageData, aiMode, setAiMode }}>
      {children}
    </PageContext.Provider>
  );
}

export function usePageContext() {
  const context = useContext(PageContext);
  if (context === undefined) {
    throw new Error("usePageContext must be used within a PageContextProvider");
  }
  return context;
}
