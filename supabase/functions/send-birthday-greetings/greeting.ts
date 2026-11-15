// Pure date and copy logic for birthday greetings. Dependency-free.

export const TIME_ZONE = "America/Santiago";
export const SEND_HOUR = 9;
export const RECOVERY_DAYS = 3;
export const GREETINGS_START_DATE = "2026-11-15"; // go-live date (first greetings run)
export const BIRTHDAY_IMAGE_URL: string | null = null;

export const INBOX_PATH = "/forja-eventos.html?inbox=1";
const INBOX_URL = `https://nacionallibertariobiobio.cl${INBOX_PATH}`;
const SIGNATURE = "Directiva Regional PNL Biobío";
const PUSH_BODY = "La familia del Partido Nacional Libertario Biobío te saluda en tu día.";
const BODY =
  "La familia del Partido Nacional Libertario Biobío te saluda en tu día. Gracias por ser parte de esta causa. ¡Que tengas un gran año!";

const PARTICLES = new Set(["DE", "DEL", "LA", "LAS", "LOS", "SAN", "SANTA", "VAN", "VON", "DA", "DI", "MC"]);

const pad = (n: number) => String(n).padStart(2, "0");
const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

export function localNow(now: Date): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}

/** `today` and the previous `days` dates, oldest first. */
export function windowDates(today: string, days = RECOVERY_DAYS): string[] {
  const [y, m, d] = today.split("-").map(Number);
  const out: string[] = [];
  for (let i = days; i >= 0; i--) {
    const dt = new Date(Date.UTC(y, m - 1, d - i));
    out.push(`${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`);
  }
  return out;
}

/** "MM-DD" list for the window; adds "02-29" when it contains 1 March of a non-leap year. */
export function monthDaysForWindow(dates: string[]): string[] {
  const set = new Set(dates.map((d) => d.slice(5)));
  if (dates.some((d) => d.slice(5) === "03-01" && !isLeap(Number(d.slice(0, 4))))) set.add("02-29");
  return [...set];
}

export function celebrationDate(birthDate: string, year: number): string {
  const monthDay = birthDate.slice(5, 10);
  if (monthDay === "02-29" && !isLeap(year)) return `${year}-03-01`;
  return `${year}-${monthDay}`;
}

export function celebrationsInWindow(
  birthDate: string,
  window: string[],
  startDate: string,
): { greetingYear: number; celebrationDate: string } | null {
  if (window.length === 0) return null;
  const years = new Set([Number(window[0].slice(0, 4)), Number(window[window.length - 1].slice(0, 4))]);
  for (const year of years) {
    const date = celebrationDate(birthDate, year);
    if (window.includes(date) && date >= startDate) return { greetingYear: year, celebrationDate: date };
  }
  return null;
}

const PUSH_RETRY = new Set(["pending", "failed"]);
const EMAIL_RETRY = new Set(["pending", "failed", "skipped_quota"]);

/** True when a push in this status still has to be (re)sent. */
export function pushNeedsSend(status: string): boolean {
  return PUSH_RETRY.has(status);
}

/** True when an email in this status still has to be (re)sent. */
export function emailNeedsSend(status: string): boolean {
  return EMAIL_RETRY.has(status);
}

/** A person is done for the year once the inbox row exists and push and email reached a final status. */
export function isGreetingComplete(row: {
  inbox_log_id: string | null;
  push_status: string;
  email_status: string;
}): boolean {
  return !!row.inbox_log_id && !pushNeedsSend(row.push_status) && !emailNeedsSend(row.email_status);
}

function capitalize(word: string): string {
  const lower = word.toLocaleLowerCase("es");
  return lower.charAt(0).toLocaleUpperCase("es") + lower.slice(1);
}

/** Given name from a padron name (APELLIDO1 APELLIDO2 NOMBRE1 ...) or a hand-typed one. "" if unknown. */
export function firstName(fullName: string): string {
  const tokens = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return "";

  let name: string;
  if (fullName === fullName.toLocaleUpperCase("es")) {
    // Padron format: skip two surnames, each absorbing preceding particles.
    let i = 0;
    for (let surname = 0; surname < 2; surname++) {
      while (i < tokens.length - 1 && PARTICLES.has(tokens[i])) i++;
      i++;
    }
    name = tokens[i] ?? "";
  } else {
    name = tokens[0];
  }

  const letters = name.match(/\p{L}/gu)?.length ?? 0;
  return letters < 3 ? "" : capitalize(name);
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildGreeting(fullName: string): {
  title: string;
  inboxBody: string;
  pushBody: string;
  emailSubject: string;
  emailHtml: string;
  emailText: string;
} {
  const name = firstName(fullName);
  const title = name ? `¡Feliz cumpleaños, ${name}!` : "¡Feliz cumpleaños!";
  const heading = `${title} 🎉`;
  const image = BIRTHDAY_IMAGE_URL
    ? `<tr><td style="padding:0 0 20px 0;"><img src="${escapeHtml(BIRTHDAY_IMAGE_URL)}" alt="" width="520" style="display:block;width:100%;max-width:520px;height:auto;border-radius:8px;"></td></tr>`
    : "";

  const emailHtml = `<!DOCTYPE html>
<html lang="es"><body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;">
<tr><td style="background:#0f172a;border-bottom:4px solid #fba931;padding:20px 24px;color:#ffffff;font-size:16px;font-weight:bold;">Partido Nacional Libertario Biobío</td></tr>
<tr><td style="padding:28px 24px;color:#0f172a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:0 0 16px 0;font-size:24px;font-weight:bold;color:#0f172a;">${escapeHtml(heading)}</td></tr>
${image}
<tr><td style="padding:0 0 24px 0;font-size:16px;line-height:1.5;color:#334155;">${escapeHtml(BODY)}</td></tr>
<tr><td style="padding:0 0 24px 0;"><a href="${INBOX_URL}" style="display:inline-block;background:#fba931;color:#0f172a;text-decoration:none;font-weight:bold;padding:12px 24px;border-radius:6px;">Abrir mi bandeja</a></td></tr>
<tr><td style="font-size:14px;color:#64748b;">${escapeHtml(SIGNATURE)}</td></tr>
</table>
</td></tr></table>
</td></tr></table>
</body></html>`;

  return {
    title,
    inboxBody: `${BODY}\n\n${SIGNATURE}`,
    pushBody: PUSH_BODY,
    emailSubject: title,
    emailHtml,
    emailText: `${heading}\n\n${BODY}\n\n${INBOX_URL}\n\n${SIGNATURE}`,
  };
}
