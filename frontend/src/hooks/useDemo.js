import { useContext } from "react";

import DemoContext from "../context/DemoContext.jsx";

/** Thin accessor for the public-contour demo session. */
export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) {
    throw new Error("useDemo must be used within a DemoProvider");
  }
  return ctx;
}

export default useDemo;