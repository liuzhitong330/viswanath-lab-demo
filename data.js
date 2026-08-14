window.VISWANATH_DEMO_DATA = {
  qcLevels: {
    lenient: { label: "Broad review", snr: 8, correlation: 0.70, drift: 15 },
    standard: { label: "Standard review", snr: 10, correlation: 0.80, drift: 10 },
    strict: { label: "Strict review", snr: 12, correlation: 0.85, drift: 8 }
  },
  responseModels: [
    {
      model: "U87IDHmut",
      context: "Engineered IDH1-mutant GBM",
      timepoint: "D5 ± 1",
      n: { Control: 4, "AG-881": 4, "BAY-1436032": 5 },
      values: {
        Control: { "2-HG": 4.10, Glu: 12.17, GLX: 16.47 },
        "AG-881": { "2-HG": 1.73, Glu: 17.35, GLX: 18.74 },
        "BAY-1436032": { "2-HG": 3.09, Glu: 16.98, GLX: 19.08 }
      }
    },
    {
      model: "BT257",
      context: "Patient-derived IDH-mutant astrocytoma",
      timepoint: "D7 ± 2",
      n: { Control: 10, "AG-881": 6, "BAY-1436032": 5 },
      values: {
        Control: { "2-HG": 8.63, Glu: 7.59, GLX: 13.19 },
        "AG-881": { "2-HG": 5.57, Glu: 11.10, GLX: 15.21 },
        "BAY-1436032": { "2-HG": 6.89, Glu: 11.22, GLX: 16.39 }
      }
    },
    {
      model: "SF10417",
      context: "Patient-derived IDH-mutant oligodendroglioma",
      timepoint: "D6 ± 2",
      n: { Control: 6, "AG-881": 6, "BAY-1436032": 5 },
      values: {
        Control: { "2-HG": 7.73, Glu: 4.93, GLX: 7.31 },
        "AG-881": { "2-HG": 7.17, Glu: 5.92, GLX: 11.48 },
        "BAY-1436032": { "2-HG": 5.98, Glu: 11.24, GLX: 13.54 }
      }
    }
  ],
  sources: {
    role: "https://aprecruit.ucsf.edu/JPF06106",
    pi: "https://cancer.ucsf.edu/people/viswanath.pavithra",
    paper: "https://pmc.ncbi.nlm.nih.gov/articles/PMC7917625/",
    dryad: "https://datadryad.org/dataset/doi%3A10.7272%2FQ6B856C7"
  }
};
