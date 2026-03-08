export function formatEAT(isoOrDate: string | Date) {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

