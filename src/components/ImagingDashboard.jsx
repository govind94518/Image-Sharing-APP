import { useEffect, useId, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { resetFilters, setFilter } from "../features/filters/filtersSlice";
import {
  clearNotice,
  closeModal,
  openStudyModal,
  setViewerSession,
  showNotice,
} from "../features/ui/uiSlice";
import {
  useGetReportQuery,
  useGetSessionQuery,
  useLaunchViewerMutation,
  useSearchStudiesQuery,
} from "../services/imagingApi";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  year: "numeric",
});

const gridDateFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

function AppIcon({ type, size = 20 }) {
  const paths = {
    image: <><path d="M8 7 9.5 4h5L16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"/><circle cx="12" cy="13" r="3"/></>,
    file: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></>,
    eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></>,
    refresh: <><path d="M20 6v5h-5"/><path d="M18.5 9A7 7 0 1 0 19 15"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    shield: <><path d="M12 2 20 5v6c0 5-3.4 8.4-8 11-4.6-2.6-8-6-8-11V5z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    reset: <><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v6h6"/></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    warning: <><path d="m12 3 10 18H2Z"/><path d="M12 9v5M12 18h.01"/></>,
    chevron: <path d="m7 10 5 5 5-5"/>,
    sort: <path d="m8 9 4-4 4 4M16 15l-4 4-4-4"/>,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[type]}
    </svg>
  );
}

function MultiSelectFilter({ id, allLabel, options, value, isOpen, onToggle, searchable = false }) {
  const dispatch = useDispatch();
  const rootRef = useRef(null);
  const [query, setQuery] = useState("");
  const noneSelected = value.includes("__none__");
  const allSelected = value.length === 0;
  const visibleOptions = options.filter((option) => option.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) onToggle(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onToggle(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen, onToggle]);

  const displayLabel = noneSelected
    ? `No ${allLabel.replace("All ", "")}`
    : allSelected
      ? allLabel
      : value.length === 1
        ? value[0]
        : `${value.length} selected`;

  const toggleOption = (option) => {
    let next;
    if (allSelected) {
      next = options.filter((item) => item !== option);
    } else if (noneSelected) {
      next = [option];
    } else if (value.includes(option)) {
      next = value.filter((item) => item !== option);
    } else {
      next = [...value, option];
    }

    if (next.length === 0) next = ["__none__"];
    if (next.length === options.length) next = [];
    dispatch(setFilter({ name: id, value: next }));
  };

  return (
    <div className="filter-root" ref={rootRef}>
      <button className="reference-filter" type="button" data-testid={`filter-${id}`} aria-expanded={isOpen} onClick={() => onToggle(!isOpen)}>
        <span title={displayLabel}>{displayLabel}</span><AppIcon type="chevron" size={17}/>
      </button>
      {isOpen && (
        <section className="filter-menu" aria-label={`${allLabel} options`}>
          <h3>{allLabel}</h3>
          {searchable && <label className="filter-search"><AppIcon type="search" size={18}/><input aria-label={`Filter ${allLabel.toLowerCase()}`} placeholder={`Filter ${allLabel.replace("All ", "").toLowerCase()}`} value={query} onChange={(event) => setQuery(event.target.value)}/></label>}
          <div className="filter-menu-actions"><button type="button" onClick={() => dispatch(setFilter({ name: id, value: [] }))}>Check all</button><span>|</span><button type="button" onClick={() => dispatch(setFilter({ name: id, value: ["__none__"] }))}>Uncheck all</button></div>
          <div className="filter-menu-options">
            {visibleOptions.map((option) => (
              <label key={option}><input type="checkbox" checked={!noneSelected && (allSelected || value.includes(option))} onChange={() => toggleOption(option)}/><span>{option}</span></label>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function LoadingRows() {
  return Array.from({ length: 4 }, (_, index) => (
    <tr key={index} className="loading-row">
      {Array.from({ length: 10 }, (__, cell) => <td key={cell}><span /></td>)}
    </tr>
  ));
}

function EmptyState({ onRefresh }) {
  const dispatch = useDispatch();
  return (
    <div className="empty-state">
      <span className="empty-icon">!</span>
      <h3>No imaging records found</h3>
      <p>The patient has no qualifying imaging metadata for the selected filters. External / DoD records are not available for this patient.</p>
      <button className="empty-refresh" onClick={() => { dispatch(resetFilters()); onRefresh(); }}>Refresh</button>
    </div>
  );
}

function ModalShell({ title, eyebrow, subtitle, children, size = "standard", hideClose = false, variant = "" }) {
  const dispatch = useDispatch();
  const titleId = useId();
  const closeButtonRef = useRef(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key === "Escape") dispatch(closeModal());
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [dispatch]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={() => dispatch(closeModal())}>
      <section className={`modal-card modal-${size} ${variant ? `modal-${variant}` : ""}`} role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={(event) => event.stopPropagation()} data-testid={variant ? `${variant}-modal` : undefined}>
        <header className="modal-header">
          <div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2 id={titleId}>{title}</h2>{subtitle && <p className="modal-subtitle">{subtitle}</p>}</div>
          {!hideClose && <button ref={closeButtonRef} className="modal-close" onClick={() => dispatch(closeModal())} aria-label="Close dialog"><AppIcon type="close"/></button>}
        </header>
        {children}
      </section>
    </div>
  );
}

function ReportDialog({ study }) {
  const { data: report, isFetching, error } = useGetReportQuery(study.reportId, { skip: !study.reportId });
  return (
    <ModalShell title="Diagnostic report" eyebrow="FHIR DiagnosticReport">
      {isFetching && <div className="modal-loading">Retrieving mocked report…</div>}
      {error && <div className="modal-error"><AppIcon type="warning"/> {error.data}</div>}
      {report && (
        <div className="report-body">
          <div className="report-title-block">
            <span className="report-status">{report.status}</span>
            <h3>{report.title}</h3>
            <p>{report.author} <span>•</span> {dateFormatter.format(new Date(report.issued))}</p>
          </div>
          <section><h4>Findings</h4><p>{report.findings}</p></section>
          <section><h4>Impression</h4><p>{report.impression}</p></section>
          <footer>Mock clinical content for interface prototyping only.</footer>
        </div>
      )}
    </ModalShell>
  );
}

function ThumbnailDialog({ study }) {
  return (
    <ModalShell title={study.description} eyebrow="Mock thumbnail">
      <div className="thumbnail-view">
        <div className="scan-placeholder"><span/><span/><span/></div>
        <dl>
          <div><dt>Modality</dt><dd>{study.modality}</dd></div>
          <div><dt>Study date</dt><dd>{dateFormatter.format(new Date(study.started))}</dd></div>
          <div><dt>Source</dt><dd>{study.sourceRepositoryId}</dd></div>
        </dl>
      </div>
    </ModalShell>
  );
}

function ViewerDialog({ study }) {
  const dispatch = useDispatch();
  const viewerSession = useSelector((state) => state.ui.viewerSession);
  const [launchViewer, { isLoading, error }] = useLaunchViewerMutation();

  const createSession = async () => {
    const session = await launchViewer(study.id).unwrap();
    dispatch(setViewerSession(session));
  };

  if (viewerSession) {
    return (
      <ModalShell title="Mock image viewer" eyebrow="Active viewer session" size="wide">
        <div className="mock-viewer">
          <aside>
            <strong>{study.description}</strong>
            <span>{study.numberOfSeries} series</span>
            {["Localizer", "Axial series", "Coronal series"].slice(0, Math.min(study.numberOfSeries, 3)).map((series, index) => (
              <button className={index === 1 ? "active" : ""} key={series}><span className="mini-scan"/>{series}</button>
            ))}
          </aside>
          <div className="viewer-canvas">
            <div className="viewer-toolbar"><span>W/L: 40 / 400</span><span>Image 48 / {study.numberOfInstances}</span><span>Zoom 100%</span></div>
            <div className="scan-large"><span/><span/><span/></div>
            <div className="viewer-security"><AppIcon type="lock" size={15}/> Mock controlled session • Expires in 5 minutes • Download disabled</div>
          </div>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell title="Launch image viewer" subtitle="A secure short-lived viewer session will be created for this imaging study." hideClose variant="launch">
      <div className="viewer-launch-body">
        <div className="study-launch-summary">
          <span className="launch-icon"><AppIcon type="image" size={26}/></span>
          <div><h3>{study.description}</h3><p>StudyInstanceUID: {study.studyInstanceUid}</p><p>Source: {study.sourceRepositoryId} <span>•</span> {study.numberOfInstances} images <span>•</span> {study.modality}</p></div>
        </div>
        <div className="session-policy">
          <h4>Viewer session details</h4>
          <div><span>TTL: <b>5 minutes</b></span><span>Access: <b>{study.sourceType === "CAMM_REST" ? "CAMM controlled proxy" : "DICOMweb controlled proxy"}</b></span><span>Download: <b>Disabled</b></span></div>
          <p>Source credentials and raw repository URLs are never exposed to the browser.</p>
        </div>
        {error && <div className="modal-error"><AppIcon type="warning"/> {error.data}</div>}
        <div className="modal-actions">
          <button className="secondary-button" onClick={() => dispatch(closeModal())}>Cancel</button>
          <button className="primary-button" data-testid="open-viewer-session" onClick={createSession} disabled={isLoading}>{isLoading ? "Creating session…" : "Open Viewer"}</button>
        </div>
      </div>
    </ModalShell>
  );
}

function ActiveModal() {
  const { modal, selectedStudy } = useSelector((state) => state.ui);
  if (!modal || !selectedStudy) return null;
  if (modal === "report") return <ReportDialog study={selectedStudy}/>;
  if (modal === "thumbnail") return <ThumbnailDialog study={selectedStudy}/>;
  return <ViewerDialog study={selectedStudy}/>;
}

function Notice() {
  const dispatch = useDispatch();
  const notice = useSelector((state) => state.ui.notice);
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => dispatch(clearNotice()), 3200);
    return () => clearTimeout(timer);
  }, [dispatch, notice]);
  if (!notice) return null;
  return <div className="notice"><AppIcon type="check" size={17}/>{notice}</div>;
}

export default function ImagingDashboard() {
  const dispatch = useDispatch();
  const filters = useSelector((state) => state.filters);
  const [openFilter, setOpenFilter] = useState(null);
  const { data: session } = useGetSessionQuery();
  const { data: result, isFetching, refetch } = useSearchStudiesQuery(filters);
  const studies = result?.entries || [];
  const facets = result?.facets || { studies: [], procedures: [], specialties: [], sites: [], dates: [] };
  const noStudies = !isFetching && studies.length === 0;

  const openModal = (type, study) => {
    if (type === "viewer" && !study.viewerAvailable) {
      dispatch(showNotice("This legacy source currently provides metadata only."));
      return;
    }
    dispatch(openStudyModal({ type, study }));
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">I</span><span><strong>OHIN Image Sharing</strong><small>SMART App <span>•</span> CDeX FHIR Proxy</small></span></div>
        <div className="connection-meta"><span>FHIR Proxy: cell1.query.cdexhub…</span><strong>Practitioner: {session?.practitioner.display || "Loading…"}</strong></div>
      </header>

      <div className="workspace">
        <section className="patient-card">
          <div><h1>{session?.patient.name || "Loading patient…"}</h1>
            <div className="patient-facts"><span>DOB: {session?.patient.birthDate || "—"}</span><span>MRN: {session?.patient.mrn || "—"}</span><span>Patient: {session?.patient.id || "—"}</span><span>Encounter: {session?.encounter?.id?.replace("Encounter/", "") || "—"}</span></div>
          </div>
          <div className="validated-badge">SMART launch context validated</div>
        </section>

        <section className="discovery-panel">
          <div className="panel-heading"><div><h2>Imaging Discovery</h2><p>FHIR R4: DiagnosticReport + ImagingStudy</p></div></div>
          <div className="discovery-controls">
            <div className="filter-row">
              <MultiSelectFilter id="studies" allLabel="All Studies" options={facets.studies} value={filters.studies} isOpen={openFilter === "studies"} onToggle={(open) => setOpenFilter(open ? "studies" : null)} searchable/>
              <MultiSelectFilter id="procedures" allLabel="All Procedures" options={facets.procedures} value={filters.procedures} isOpen={openFilter === "procedures"} onToggle={(open) => setOpenFilter(open ? "procedures" : null)}/>
              <MultiSelectFilter id="specialties" allLabel="All Specialties" options={facets.specialties} value={filters.specialties} isOpen={openFilter === "specialties"} onToggle={(open) => setOpenFilter(open ? "specialties" : null)}/>
              <MultiSelectFilter id="sites" allLabel="All Sites" options={facets.sites} value={filters.sites} isOpen={openFilter === "sites"} onToggle={(open) => setOpenFilter(open ? "sites" : null)}/>
              <MultiSelectFilter id="dates" allLabel="All Dates" options={facets.dates} value={filters.dates} isOpen={openFilter === "dates"} onToggle={(open) => setOpenFilter(open ? "dates" : null)}/>
            </div>
            <div className="filter-options">
              <label><input data-testid="current-encounter-toggle" type="checkbox" checked={filters.currentEncounterOnly} onChange={(event) => dispatch(setFilter({ name: "currentEncounterOnly", value: event.target.checked }))}/><span>Current Encounter Only</span></label>
              <label><input data-testid="external-records-toggle" type="checkbox" checked={filters.includeExternal} onChange={(event) => dispatch(setFilter({ name: "includeExternal", value: event.target.checked }))}/><span>Include External / DoD</span></label>
            </div>
            <label className="search-field"><AppIcon type="search" size={19}/><input aria-label="Search table" placeholder="Search table" value={filters.search} onChange={(event) => dispatch(setFilter({ name: "search", value: event.target.value }))}/></label>
            <button className="icon-button" onClick={() => refetch()} aria-label="Refresh studies"><AppIcon type="refresh" size={25}/></button>
          </div>
        </section>

        <section className={`results-card ${noStudies ? "empty-results-card" : ""}`}>
          {noStudies ? <EmptyState onRefresh={() => refetch()}/> : (
            <div className="table-wrap">
              <table>
                <thead><tr><th><button className="sort-button" type="button" onClick={() => dispatch(setFilter({ name: "sortDirection", value: filters.sortDirection === "desc" ? "asc" : "desc" }))}>Date <AppIcon type="sort" size={14}/></button></th><th>Study Description</th><th>Procedure</th><th>Specialty</th><th>Site #</th><th>Site Name</th><th># Images</th><th>Image</th><th>Report</th><th>Thumb</th></tr></thead>
                <tbody>
                  {isFetching ? <LoadingRows/> : studies.map((study) => (
                    <tr key={study.id} className={study.sourceKind !== "OHIN" ? "external-row" : ""}>
                      <td>{gridDateFormatter.format(new Date(study.started)).replace(",", "")}</td>
                      <td>{study.description}</td><td>{study.modality}</td><td>{study.specialty}</td><td>{study.siteNumber}</td><td className={study.sourceKind !== "OHIN" ? "external-site" : ""}>{study.siteName}</td><td>{study.numberOfInstances}</td>
                      <td><button className="grid-action image-action" disabled={!study.viewerAvailable} onClick={() => openModal("viewer", study)} aria-label={`View ${study.description}`}><AppIcon type="image"/></button></td>
                      <td><button className="grid-action report-action" disabled={!study.reportId} onClick={() => openModal("report", study)} aria-label={`Open report for ${study.description}`}><AppIcon type="file"/></button></td>
                      <td><button className="grid-action thumb-action" disabled={!study.thumbnailAvailable} onClick={() => openModal("thumbnail", study)} aria-label={`View thumbnail for ${study.description}`}><AppIcon type="eye"/></button></td>
                    </tr>
                  ))}
                  {!isFetching && studies.length > 0 && <tr className="filler-row">{Array.from({ length: 10 }, (_, index) => <td key={index}/>)}</tr>}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {noStudies ? (
          <section className="identifier-policy"><h3>Patient identifier policy</h3><p>If a patient is missing the enterprise identifier required by OHIN EMPI, the app will stop query execution and show a controlled warning.</p></section>
        ) : (
          <section className="source-strip"><h3>{filters.includeExternal ? "External data included for this session" : "Source status"}</h3><p>{filters.includeExternal ? "DoD/external records are merged into the grid and dynamic filters update based on the expanded result set." : `${result?.total || 0} records loaded from OHIN Image Sharing. External / DoD records are excluded by default for performance.`}</p>{!filters.includeExternal && <span className="proxy-status">FHIR proxy connected</span>}</section>
        )}
      </div>
      <ActiveModal/>
      <Notice/>
    </main>
  );
}
