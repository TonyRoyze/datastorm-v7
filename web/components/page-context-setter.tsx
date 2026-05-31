"use client";

import { useEffect } from "react";
import { usePageContext } from "./page-context";

export function PageContextSetter({ data }: { data: any }) {
  const { setPageData } = usePageContext();

  useEffect(() => {
    setPageData(data);
  }, [data, setPageData]);

  return null;
}
