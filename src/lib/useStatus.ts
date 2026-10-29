"use client";

import { useEffect, useState } from "react";

export function useApiStatus() {
  const [status, setStatus] = useState<{ live: boolean; units: number | null } | null>(null);
  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);
  return status;
}
