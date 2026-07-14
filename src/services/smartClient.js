const DEFAULT_CLIENT_ID = "9bc9f7d6-42de-4315-ab9e-443f21de13ee";

const EHR_LAUNCH_SCOPES = [
  "launch",
  "openid",
  "fhirUser",
  "patient/Patient.read",
  "patient/Encounter.read",
  "patient/DiagnosticReport.read",
  "patient/ImagingStudy.read",
].join(" ");

const STANDALONE_SCOPES = [
  "launch/patient",
  "online_access",
  "openid",
  "profile",
  "patient/Patient.read",
  "patient/Encounter.read",
  "patient/DiagnosticReport.read",
  "patient/ImagingStudy.read",
].join(" ");

let authorizationPromise;
let clientPromise;

const getFhir = () => {
  if (!window.FHIR?.oauth2) {
    throw new Error("The SMART on FHIR client library did not load.");
  }
  return window.FHIR;
};

const getRedirectUri = () =>
  new URL(`${import.meta.env.BASE_URL}index.html`, window.location.origin).toString();

const getClientId = () =>
  import.meta.env.VITE_SMART_CLIENT_ID?.trim() || DEFAULT_CLIENT_ID;

export const getSmartLaunchPhase = (search = window.location.search) => {
  const params = new window.URLSearchParams(search);
  if (params.has("error")) return "error";
  if (params.has("code") && params.has("state")) return "callback";
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
      scope: params.has("launch") ? EHR_LAUNCH_SCOPES : STANDALONE_SCOPES,
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

export const getSmartSession = async () => {
  if (!clientPromise) clientPromise = getFhir().oauth2.ready();
  const client = await clientPromise;
  const patient = await client.patient.read();
  const practitioner = await readPractitioner(client);
  const mrn = findMrn(patient);
  const patientId = patient.id || client.patient?.id;
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
