"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MIN_BASELINE_SCANS, compare, computeBaseline, guidance, type Change, type GuidanceResult } from "./stats";
import { getProfile, levelsOf, listScans, type Profile, type Scan } from "./store";

export interface CheckIn {
  scan: Scan;
  changes: Change[] | null;
  guidance: GuidanceResult;
}

export function useJourney() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | undefined>();
  const [scans, setScans] = useState<Scan[]>([]);

  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let alive = true;
    Promise.all([getProfile(), listScans()]).then(([p, s]) => {
      if (!alive) return;
      setProfile(p);
      setScans(s);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [version]);

  const derived = useMemo(() => {
    const baselineScans = scans.filter((s) => s.kind === "baseline");
    const baseline = baselineScans.length >= MIN_BASELINE_SCANS ? computeBaseline(baselineScans.map(levelsOf)) : null;
    const checkIns: CheckIn[] = scans
      .filter((s) => s.kind === "checkin")
      .map((scan) => {
        const changes = baseline ? compare(levelsOf(scan), baseline) : null;
        return { scan, changes, guidance: guidance(changes, scan.symptoms) };
      });
    return { baselineScans, baseline, checkIns, latest: checkIns.at(-1) ?? null };
  }, [scans]);

  return { loading, profile, scans, reload, ...derived };
}
