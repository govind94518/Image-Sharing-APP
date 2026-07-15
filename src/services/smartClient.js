const DEFAULT_CLIENT_ID = "42cc2858-be27-4cd4-98c8-3f3cb8cbcc08";
const SMART_CLIENT_SECRET = "Ou9_WuHhmF24ll4GvtLZ24XNm0T99dlg";

const EHR_LAUNCH_SCOPES = [
  "launch",
  "openid",
  "fhirUser",
  "patient/Patient.read",
  "patient/Encounter.read",
  "patient/DiagnosticReport.read",
  "patient/ServiceRequest.read",
  "patient/Binary.read",
].join(" ");

const STANDALONE_SCOPES = [
  "launch/patient",
  "online_access",
  "openid",
  "profile",
  "patient/Patient.read",
  "patient/Encounter.read",
  "patient/DiagnosticReport.read",
  "patient/ServiceRequest.read",
  "patient/Binary.read",
].join(" ");

let authorizationPromise;
let clientPromise;

const getFhir = () => {
  if (!window.FHIR?.oauth2) {
    throw new Error("The SMART on FHIR client library did not load.");
  }
  return window.FHIR;
};

const getRedirectUri = () => {
  const configuredRedirectUri = import.meta.env.VITE_SMART_REDIRECT_URI?.trim();
  if (configuredRedirectUri) return configuredRedirectUri;

  // Preserve the launch path that was registered with the EHR. This supports
  // both /index.html and /launch registrations on GitHub Pages.
  const redirectUri = new URL(window.location.href);
  redirectUri.search = "";
  redirectUri.hash = "";
  return redirectUri.toString();
};

const getClientId = () =>
  import.meta.env.VITE_SMART_CLIENT_ID?.trim() || DEFAULT_CLIENT_ID;

const getSmartScope = () => {
  const configuredScope = import.meta.env.VITE_SMART_SCOPE?.trim();
  if (configuredScope) return configuredScope;

  const params = new window.URLSearchParams(window.location.search);
  return params.has("launch") ? EHR_LAUNCH_SCOPES : STANDALONE_SCOPES;
};

export const getSmartLaunchPhase = (search = window.location.search) => {
  const params = new window.URLSearchParams(search);
  if (params.has("error")) return "error";
  if (params.has("code") || params.has("state")) return "callback";
  if (params.has("iss")) return "launch";
  return "demo";
};

export const getSmartAuthorizationError = (search = window.location.search) => {
  const params = new window.URLSearchParams(search);
  return (
    params.get("error_description") ||
    params.get("error") ||
    "The SMART authorization server returned an error."
  );
};

export const beginSmartAuthorization = () => {
  if (authorizationPromise) return authorizationPromise;

  const params = new window.URLSearchParams(window.location.search);
  if (!params.has("iss")) {
    throw new Error("The SMART launch URL is missing the iss parameter.");
  }

  authorizationPromise = Promise.resolve(
    getFhir().oauth2.authorize({
      clientId: getClientId(),
      scope: getSmartScope(),
      redirectUri: getRedirectUri(),
    }),
  );

  return authorizationPromise;
};

const formatHumanName = (resource, fallback) => {
  const name = resource?.name?.find((item) => item.use === "official") || resource?.name?.[0];
  if (!name) return fallback;
  if (name.text) return name.text;

  const parts = [
    ...(name.prefix || []),
    ...(name.given || []),
    name.family,
  ].filter(Boolean);
  return parts.join(" ") || fallback;
};

const findMrn = (patient) => {
  const identifiers = patient?.identifier || [];
  const mrn = identifiers.find((identifier) =>
    identifier.type?.coding?.some((coding) => coding.code === "MR"),
  );
  return mrn || identifiers.find((identifier) => identifier.use === "official") || identifiers[0];
};

const readPractitioner = async (client) => {
  try {
    if (typeof client.user?.read === "function") {
      const resource = await client.user.read();
      return {
        id: `${resource.resourceType}/${resource.id}`,
        display: formatHumanName(resource, "Authenticated user"),
      };
    }
  } catch {
    // Some EHR sandboxes grant patient context without allowing a user read.
  }

  const fhirUser = client.state?.tokenResponse?.fhirUser;
  return {
    id: fhirUser || "SMART user",
    display: fhirUser?.split("/").pop() || "Authenticated user",
  };
};

const normalizeResourceId = (value, resourceType) =>
  String(value || "").replace(new RegExp(`^${resourceType}/`), "").split("?")[0];

const readPatient = async (client) => {
  if (client.patient?.id && typeof client.patient.read === "function") {
    return client.patient.read();
  }

  const tokenPatientId = client.state?.tokenResponse?.patient || client.patient?.id;
  if (tokenPatientId) {
    const patientId = normalizeResourceId(tokenPatientId, "Patient");
    return client.request(`/Patient/${encodeURIComponent(patientId)}`);
  }

  // Some SMART servers return patient context only in the access token and do
  // not populate client.patient. The reference app falls back to one Patient
  // search so those launches can still be completed.
  const bundle = await client.request("/Patient?_count=1");
  const entry = bundle?.entry?.find((item) => item.resource?.resourceType === "Patient");
  if (!entry?.resource) {
    throw new Error("The EHR did not return a Patient resource in the SMART context.");
  }
  return entry.resource;
};

export const getSmartSession = async () => {
  if (!clientPromise) clientPromise = getFhir().oauth2.ready();
  const client = await clientPromise;
  const patient = await readPatient(client);
  const practitioner = await readPractitioner(client);
  const mrn = findMrn(patient);
  const patientId = patient.id || normalizeResourceId(client.state?.tokenResponse?.patient || client.patient?.id, "Patient");
  const encounterId = client.encounter?.id || client.state?.tokenResponse?.encounter;

  if (!patientId) {
    throw new Error("The EHR did not include a patient in the SMART launch context.");
  }

  return {
    status: "authenticated",
    mode: "smart",
    environment: "Oracle Health SMART",
    serverUrl: client.state?.serverUrl || new window.URLSearchParams(window.location.search).get("iss"),
    practitioner,
    patient: {
      id: patientId,
      fhirReference: `Patient/${patientId}`,
      ehrReference: `Patient/${patientId}`,
      name: formatHumanName(patient, "Unknown patient"),
      birthDate: patient.birthDate,
      mrn: mrn?.value,
      identifierSystem: mrn?.system,
    },
    encounter: {
      id: encounterId ? `Encounter/${String(encounterId).replace(/^Encounter\//, "")}` : undefined,
      display: encounterId ? "SMART launch encounter" : "No encounter in launch context",
    },
    smartContextValidated: true,
  };
};

export const smartConfiguration = {
  clientId: getClientId(),
  redirectUri: getRedirectUri(),
};
