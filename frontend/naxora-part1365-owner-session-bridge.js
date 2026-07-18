(function () {
  "use strict";

  const TOKEN_KEYS = [
    "naxoraToken",
    "naxora_token",
    "authToken",
    "accessToken",
    "token",
    "jwt",
  ];

  function firstStored(key) {
    return sessionStorage.getItem(key) || localStorage.getItem(key) || "";
  }

  function findToken() {
    for (const storage of [sessionStorage, localStorage]) {
      for (const key of TOKEN_KEYS) {
        const value = String(storage.getItem(key) || "").trim();
        if (value && value.split(".").length === 3) return value;
      }
    }
    return "";
  }

  function readSession() {
    for (const storage of [sessionStorage, localStorage]) {
      try {
        const parsed = JSON.parse(storage.getItem("naxoraSession") || "{}");
        if (parsed && typeof parsed === "object") return parsed;
      } catch {
        // Ignore invalid local display metadata. Server JWT remains authoritative.
      }
    }
    return {};
  }

  function decodePayload(token) {
    try {
      const part = token.split(".")[1];
      const normalized = part.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
      return JSON.parse(decodeURIComponent(
        Array.from(atob(padded))
          .map(char => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
          .join("")
      ));
    } catch {
      return {};
    }
  }

  const token = findToken();
  const savedSession = readSession();
  const payload = token ? decodePayload(token) : {};

  const instituteId = String(
    savedSession.instituteId ||
    payload.instituteId ||
    payload.institute_id ||
    firstStored("naxoraInstituteId") ||
    firstStored("instituteId") ||
    ""
  ).trim();

  const role = String(
    savedSession.role ||
    payload.role ||
    payload.userRole ||
    ""
  ).trim();

  if (token) {
    sessionStorage.setItem("part119SessionToken", token);
    sessionStorage.setItem("naxoraToken", token);
  }

  if (instituteId) {
    sessionStorage.setItem("part119InstituteId", instituteId);
    sessionStorage.setItem("naxoraInstituteId", instituteId);
  }

  if (role) {
    sessionStorage.setItem("naxoraLastRole", role);
  }

  window.NAXORA_PART1365_SESSION = Object.freeze({
    tokenPresent: Boolean(token),
    instituteIdPresent: Boolean(instituteId),
    role,
    bridgedToPart119: Boolean(token),
  });
})();
