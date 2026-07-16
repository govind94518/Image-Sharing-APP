const DEFAULT_LOCAL_BFF_URL = "http://localhost:8084";
const BFF_SESSION_STORAGE_KEY = "image_sharing_bff_session";

const normalizeBaseUrl = (value) => value.replace(/\/+$/, "");

export const getSmartBffUrl = () => {
  const configuredUrl = import.meta.env.VITE_SMART_BFF_URL?.trim();
  if (configuredUrl) return normalizeBaseUrl(configuredUrl);

  // The local BFF is deliberately the only development default. A deployed
  // static UI must be built with the URL of its deployed BFF.
  return import.meta.env.DEV ? DEFAULT_LOCAL_BFF_URL : "";
};

const buildBffUrl = (path) => {
  const baseUrl = getSmartBffUrl();
  if (!baseUrl) {
    throw new Error(
      "The SMART BFF URL is not configured. Set VITE_SMART_BFF_URL when building the deployed UI.",
    );
  }
  return `${baseUrl}${path}`;
};

const getHashParams = (hash = window.location.hash) =>
  new window.URLSearchParams(hash.replace(/^#/, ""));

export const getSmartLaunchPhase = (
  search = window.location.search,
  hash = window.location.hash,
) => {
  const params = new window.URLSearchParams(search);
  const hashParams = getHashParams(hash);
  if (params.has("smart_error") || params.has("error")) return "error";

  // A callback at the React app means the Oracle registration still points to
  // the UI instead of the BFF callback endpoint. The BFF must receive code.
  if (params.has("code") || params.has("state")) return "error";
  if (params.get("smart") === "connected" || hashParams.get("smart") === "connected") {
    return "connected";
  }
  if (params.has("iss") && params.has("launch")) return "launch";
  if (params.has("iss")) return "error";
  return "demo";
};

const errorMessages = {
  authorization_denied: "The authorization request was cancelled or denied by the EHR.",
  bff_not_configured: "The local SMART BFF is missing its client configuration.",
  ehr_connection_failed: "The SMART BFF could not reach the EHR authorization service.",
  expired_launch: "The SMART launch expired. Launch the app again from the EHR.",
  invalid_issuer: "The EHR issuer is not allowed by the SMART BFF configuration.",
  invalid_launch: "The SMART launch context is incomplete. It must include iss and launch.",
  missing_patient_context: "The EHR did not provide a selected patient context for this launch.",
  patient_access_forbidden:
    "Oracle Health denied the Patient read. Confirm Patient Read API access and the granted user/Patient.read scope, then launch again.",
  patient_not_found:
    "SMART authorization succeeded, but Oracle Test Sandbox returned a patient ID that does not exist on its FHIR server. Launch with a valid patient from a working Millennium sandbox or domain.",
  patient_context_failed: "The BFF could not load the selected patient from the EHR.",
  smart_discovery_failed: "The EHR did not provide SMART authorization endpoint metadata.",
  token_exchange_failed: "The authorization server rejected the authorization code.",
};

export const getSmartAuthorizationError = (search = window.location.search) => {
  const params = new window.URLSearchParams(search);
  if (params.has("code") || params.has("state")) {
    return "The OAuth callback reached the React UI. Register the BFF callback URL in Oracle Health, then launch again.";
  }

  const errorCode = params.get("smart_error") || params.get("error");
  return errorMessages[errorCode] || "The SMART authorization server returned an error.";
};

export const getSmartAuthorizationErrorTitle = (search = window.location.search) => {
  const errorCode = new window.URLSearchParams(search).get("smart_error");
  if (errorCode === "patient_not_found") return "Sandbox patient data unavailable";
  if (errorCode === "patient_access_forbidden") return "Patient access denied";
  return "SMART authorization failed";
};

export const beginSmartAuthorization = () => {
  const params = new window.URLSearchParams(window.location.search);
  const iss = params.get("iss");
  const launch = params.get("launch");
  if (!iss || !launch) {
    throw new Error("The SMART launch URL must contain both iss and launch parameters.");
  }

  const launchUrl = new window.URL(buildBffUrl("/smart/launch"));
  launchUrl.searchParams.set("iss", iss);
  launchUrl.searchParams.set("launch", launch);
  window.location.assign(launchUrl.toString());
  return Promise.resolve();
};

const getBffSessionToken = () => {
  const hashParams = getHashParams();
  const handoffToken = hashParams.get("bff_session")?.trim();
  if (handoffToken) {
    window.sessionStorage.setItem(BFF_SESSION_STORAGE_KEY, handoffToken);

    const cleanUrl = new window.URL(window.location.href);
    cleanUrl.hash = "";
    cleanUrl.searchParams.set("smart", "connected");
    window.history.replaceState({}, "", cleanUrl);
    return handoffToken;
  }

  return window.sessionStorage.getItem(BFF_SESSION_STORAGE_KEY)?.trim() || "";
};

export const getSmartSession = async () => {
  const sessionToken = getBffSessionToken();
  const response = await window.fetch(buildBffUrl("/api/session"), {
    credentials: sessionToken ? "omit" : "include",
    headers: {
      Accept: "application/json",
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      window.sessionStorage.removeItem(BFF_SESSION_STORAGE_KEY);
      throw new Error("The local SMART session has expired. Launch the app again from the EHR.");
    }
    throw new Error("The SMART BFF could not load the authenticated session.");
  }

  return response.json();
};
