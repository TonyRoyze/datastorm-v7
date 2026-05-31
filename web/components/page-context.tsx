"use client";

import React, { createContext, useContext, useState } from "react";

type PageContextType = {
  pageData: any;
  setPageData: (data: any) => void;
};

const PageContext = createContext<PageContextType | undefined>(undefined);

export function PageContextProvider({ children }: { children: React.ReactNode }) {
  const [pageData, setPageData] = useState<any>(null);

  return (
    <PageContext.Provider value={{ pageData, setPageData }}>
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
