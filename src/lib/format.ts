export function formatPrice(value: number, currency = "FCFA"): string {
  return `${Math.round(value).toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ")} ${currency}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s.-]/g, "");
  return /^\+?\d{8,15}$/.test(cleaned);
}
