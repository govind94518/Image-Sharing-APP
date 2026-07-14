import { useEffect, useMemo, useState } from "react";
import ImagingDashboard from "./ImagingDashboard";
import {
  beginSmartAuthorization,
  getSmartAuthorizationError,
  getSmartLaunchPhase,
} from "../services/smartClient";

function LaunchStatus({ title, message, error = false }) {
  return (
    <main className="smart-launch-screen">
      <section className={`smart-launch-panel${error ? " smart-launch-error" : ""}`}>
        <span className={error ? "smart-launch-warning" : "smart-launch-spinner"} aria-hidden="true">
          {error ? "!" : ""}
        </span>
        <h1>{title}</h1>
        <p>{message}</p>
        {error && (
          <button type="button" onClick={() => window.location.assign(import.meta.env.BASE_URL)}>
            Open demo application
          </button>
        )}
      </section>
    </main>
  );
}

export default function SmartLaunchGate() {
  const phase = useMemo(() => getSmartLaunchPhase(), []);
  const [launchError, setLaunchError] = useState(null);

  useEffect(() => {
    if (phase !== "launch") return;
    beginSmartAuthorization().catch((error) => {
      setLaunchError(error instanceof Error ? error.message : "SMART authorization could not start.");
    });
  }, [phase]);

  if (phase === "error") {
    return (
      <LaunchStatus
        error
        title="SMART authorization failed"
        message={getSmartAuthorizationError()}
      />
    );
  }

  if (phase === "launch") {
    return (
      <LaunchStatus
        error={Boolean(launchError)}
        title={launchError ? "SMART authorization could not start" : "Connecting to Oracle Health"}
        message={launchError || "Validating the EHR launch context and opening the authorization server."}
      />
    );
  }

  return <ImagingDashboard />;
}
