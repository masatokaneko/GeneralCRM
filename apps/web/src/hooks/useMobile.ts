"use client";

import { useMediaQuery } from "@/hooks/useMediaQuery";

export function useMobile() {
  const isMobile = useMediaQuery("(max-width: 768px)");
  return isMobile;
}
