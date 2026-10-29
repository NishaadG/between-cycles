// Every piece of guidance in the app points at one of these.

export type SourceId = "stgeorges" | "macmillan" | "uspharm" | "ncoda" | "mascc" | "basch" | "esmo" | "vendor";

export interface Source {
  id: SourceId;
  title: string;
  publisher: string;
  url: string;
}

export const SOURCES: Record<SourceId, Source> = {
  stgeorges: {
    id: "stgeorges",
    title: "Skin changes and cancer",
    publisher: "St George's University Hospitals NHS Foundation Trust",
    url: "https://www.stgeorges.nhs.uk/service/living-with-and-beyond-cancer-2/managing-physical-consequences-of-cancer-and-cancer-treatment/skin-changes-and-cancer/",
  },
  macmillan: {
    id: "macmillan",
    title: "Dry, sore and itchy skin",
    publisher: "Macmillan Cancer Support",
    url: "https://www.macmillan.org.uk/_images/dry-sore-itchy-skin_tcm9-356295.pdf",
  },
  uspharm: {
    id: "uspharm",
    title: "Epidermal Growth Factor Receptor Inhibitors and Skin Rash",
    publisher: "U.S. Pharmacist",
    url: "https://www.uspharmacist.com/article/epidermal-growth-factor-receptor-inhibitors-and-skin-rash",
  },
  ncoda: {
    id: "ncoda",
    title: "Managing EGFR Inhibitor Induced Rash (PQI)",
    publisher: "NCODA",
    url: "https://ncoda.org/wp-content/uploads/2025/03/Managing-EGFR-Inhibitor-Induced-Rash_PQI_NCODA.pdf",
  },
  mascc: {
    id: "mascc",
    title:
      "Clinical practice guidelines for the prevention and treatment of EGFR inhibitor-associated dermatologic toxicities (Lacouture et al., Supportive Care in Cancer, 2011)",
    publisher: "MASCC Skin Toxicity Study Group",
    url: "https://link.springer.com/article/10.1007/s00520-011-1197-6",
  },
  basch: {
    id: "basch",
    title: "Overall Survival Results of a Trial Assessing Patient-Reported Outcomes for Symptom Monitoring During Routine Cancer Treatment (Basch et al., JAMA, 2017)",
    publisher: "JAMA / Memorial Sloan Kettering",
    url: "https://www.mskcc.org/press-releases/real-time-patient-reported-symptom-monitoring-demonstrates-overall-survival-benefit",
  },
  esmo: {
    id: "esmo",
    title: "Papulopustular rash: symptoms and grading",
    publisher: "ESMO OncologyPRO",
    url: "https://oncologypro.esmo.org/oncology-in-practice/palliative-and-supportive-care/multikinase-inhibitor-related-skin-toxicity/healthcare-professionals/symptoms-and-grading/skin-changes/papulopustular-rash",
  },
  vendor: {
    id: "vendor",
    title: "AI Skin Analysis API reference",
    publisher: "Perfect Corp. YouCam API",
    url: "https://docs.makeupar.com/reference/ai_skin_analysis.md",
  },
};
