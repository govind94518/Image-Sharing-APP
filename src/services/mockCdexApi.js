import { mockEndpoints, mockReports, mockSession, mockStudies } from "../mocks/mockCdexData.js";

const wait = (milliseconds = 240) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const includesText = (study, search) => {
  if (!search) return true;
  const haystack = [
    study.description,
    study.procedure,
    study.modality,
    study.specialty,
    study.siteName,
    study.accessionNumber,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(search.toLowerCase());
};

const unique = (items) => [...new Set(items)].sort((left, right) => left.localeCompare(right));

const matchesMultiSelect = (value, selected = []) =>
  selected.length === 0 || selected.includes(value);

const matchesDateFilter = (started, selected = []) => {
  if (selected.length === 0) return true;
  const studyDate = new Date(started);
  const now = new Date("2026-07-10T12:00:00Z");

  return selected.some((option) => {
    if (option === "Last 30 Days") return now - studyDate <= 30 * 24 * 60 * 60 * 1000;
    if (option === "Last 90 Days") return now - studyDate <= 90 * 24 * 60 * 60 * 1000;
    if (option === "Last 12 Months") return now - studyDate <= 365 * 24 * 60 * 60 * 1000;
    return String(studyDate.getUTCFullYear()) === option;
  });
};

export const mockCdexClient = {
  async getSession() {
    await wait(120);
    return structuredClone(mockSession);
  },

  async searchStudies(filters = {}) {
    await wait();
    const {
      studies: selectedStudies = [],
      procedures = [],
      specialties = [],
      sites = [],
      dates = [],
      search = "",
      includeExternal = false,
      currentEncounterOnly = false,
      sortDirection = "desc",
    } = filters;

    const availableStudies = mockStudies.filter(
      (study) => includeExternal || study.sourceKind === "OHIN",
    );

    const studies = availableStudies.filter((study) => {
      if (!includeExternal && study.sourceKind !== "OHIN") return false;
      if (currentEncounterOnly && study.encounterId !== mockSession.encounter.id) return false;
      if (!matchesMultiSelect(study.description, selectedStudies)) return false;
      if (!matchesMultiSelect(study.procedure, procedures)) return false;
      if (!matchesMultiSelect(study.specialty, specialties)) return false;
      if (!matchesMultiSelect(study.siteName, sites)) return false;
      if (!matchesDateFilter(study.started, dates)) return false;
      return includesText(study, search);
    }).sort((left, right) => {
      const comparison = new Date(left.started) - new Date(right.started);
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return {
      resourceType: "Bundle",
      type: "searchset",
      total: studies.length,
      timestamp: new Date().toISOString(),
      entries: structuredClone(studies),
      facets: {
        studies: unique(availableStudies.map((study) => study.description)),
        procedures: unique(availableStudies.map((study) => study.procedure)),
        specialties: unique(availableStudies.map((study) => study.specialty)),
        sites: unique(availableStudies.map((study) => study.siteName)),
        dates: ["Last 30 Days", "Last 90 Days", "Last 12 Months", "2026", "2025", "2024"],
      },
      source: "mock-cdex-adapter",
    };
  },

  async getReport(reportId) {
    await wait(180);
    const report = mockReports[reportId];
    if (!report) throw new Error("The selected study does not have a report.");
    return structuredClone(report);
  },

  async getEndpoint(studyId) {
    await wait(120);
    return structuredClone(mockEndpoints[studyId] || null);
  },

  async launchViewer(studyId) {
    await wait(420);
    const study = mockStudies.find((item) => item.id === studyId);
    if (!study) throw new Error("Imaging study was not found.");
    if (!study.viewerAvailable) {
      throw new Error("This source currently supports metadata discovery only.");
    }

    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + 5 * 60 * 1000);
    return {
      resourceType: "Parameters",
      launchStatus: "CREATED",
      launchSessionId: `mock_vls_${study.id}`,
      launchUrl: `/mock-viewer?session=mock_vls_${study.id}`,
      expiresAt: expiresAt.toISOString(),
      ttlSeconds: 300,
      viewerType: "ZERO_FOOTPRINT_WEB",
      accessMode: study.sourceType === "CAMM_REST" ? "CAMM_CONTROLLED_PROXY" : "DICOMWEB_CONTROLLED_PROXY",
      study: structuredClone(study),
    };
  },
};
