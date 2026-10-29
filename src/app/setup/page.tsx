"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { PageTitle } from "@/components/ui";
import { TREATMENTS, getProfile, resetAll, saveProfile, type Treatment } from "@/lib/store";

const today = () => new Date().toISOString().slice(0, 10);

export default function Setup() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [treatment, setTreatment] = useState<Treatment>("unsure");
  const [start, setStart] = useState(today());
  const [cycleLength, setCycleLength] = useState(21);

  useEffect(() => {
    getProfile().then((p) => {
      if (!p || p.demo) return;
      setName(p.name);
      setTreatment(p.treatment);
      setStart(p.firstCycleStart);
      setCycleLength(p.cycleLength);
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const existing = await getProfile();
    if (existing?.demo) await resetAll();
    await saveProfile({ name: name.trim(), treatment, firstCycleStart: start, cycleLength });
    router.push("/today");
  }

  return (
    <Shell>
      <PageTitle title="About your treatment" subtitle="Used only to line up your scans with your treatment cycles. Stored on this device." />
      <form onSubmit={submit} className="card space-y-5 p-5">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">First name (optional, shown on your report)</span>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        </label>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Treatment type</legend>
          <div className="space-y-2">
            {TREATMENTS.map((t) => (
              <label key={t.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-line p-3 has-[:checked]:border-primary has-[:checked]:bg-primary-soft">
                <input type="radio" name="treatment" checked={treatment === t.id} onChange={() => setTreatment(t.id)} className="accent-[var(--primary)]" />
                <span className="text-sm">{t.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">First day of cycle 1</span>
            <input type="date" className="field" value={start} onChange={(e) => setStart(e.target.value)} required />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Cycle length (days)</span>
            <select className="field" value={cycleLength} onChange={(e) => setCycleLength(Number(e.target.value))}>
              {[7, 14, 21, 28].map((d) => (
                <option key={d} value={d}>
                  {d} days
                </option>
              ))}
            </select>
          </label>
        </div>

        <button className="btn btn-primary w-full">Save and continue</button>
      </form>
    </Shell>
  );
}
