import { assert, assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  buildGreeting,
  celebrationDate,
  celebrationsInWindow,
  emailNeedsSend,
  firstName,
  isGreetingComplete,
  localNow,
  monthDaysForWindow,
  pushNeedsSend,
  windowDates,
} from "./greeting.ts";

Deno.test("localNow uses America/Santiago with DST", () => {
  assertEquals(localNow(new Date("2026-11-14T12:00:00Z")), { date: "2026-11-14", hour: 9 });
  assertEquals(localNow(new Date("2026-06-15T12:00:00Z")).hour, 8);
  assertEquals(localNow(new Date("2026-06-15T13:00:00Z")).hour, 9);
});

Deno.test("windowDates spans the year boundary, oldest first", () => {
  assertEquals(windowDates("2027-01-01"), ["2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01"]);
});

Deno.test("celebrationDate moves 29 Feb to 1 Mar in non-leap years", () => {
  assertEquals(celebrationDate("2000-02-29", 2027), "2027-03-01");
  assertEquals(celebrationDate("2000-02-29", 2028), "2028-02-29");
  assertEquals(celebrationDate("1990-12-30", 2026), "2026-12-30");
});

Deno.test("monthDaysForWindow adds 02-29 for 1 March of non-leap years", () => {
  const nonLeap = monthDaysForWindow(windowDates("2027-03-01"));
  assert(nonLeap.includes("02-29"));
  assert(nonLeap.includes("03-01"));
  assert(monthDaysForWindow(windowDates("2028-03-01")).includes("02-29"));
  assert(!monthDaysForWindow(windowDates("2026-11-14")).includes("02-29"));
});

Deno.test("celebrationsInWindow", () => {
  assertEquals(
    celebrationsInWindow("1990-12-30", windowDates("2027-01-01"), "2026-11-20"),
    { greetingYear: 2026, celebrationDate: "2026-12-30" },
  );
  assertEquals(celebrationsInWindow("1990-11-12", windowDates("2026-11-14"), "2026-11-14"), null);
  assertEquals(celebrationsInWindow("1990-11-10", windowDates("2026-11-14"), "2026-11-01"), null);
  assertEquals(
    celebrationsInWindow("2000-02-29", windowDates("2027-03-01"), "2026-11-01"),
    { greetingYear: 2027, celebrationDate: "2027-03-01" },
  );
});

Deno.test("firstName from padron format", () => {
  assertEquals(firstName("ALEXANDRE MOYA MARCELA PILAR"), "Marcela");
  assertEquals(firstName("GUIÑEZ FLORES GABRIEL ANTONIO"), "Gabriel");
  assertEquals(firstName("DE LA FUENTE SOTO JUAN PABLO"), "Juan");
  assertEquals(firstName("SOTO DEL RIO ÁLVARO"), "Álvaro");
  assertEquals(firstName("VALENZUELA RIVAS SIGISFREDO"), "Sigisfredo");
  assertEquals(firstName("PEREZ SOTO JU"), "");
  assertEquals(firstName("PEREZ SOTO"), "");
});

Deno.test("firstName from hand-typed names", () => {
  assertEquals(firstName("  Nicolás Rodrigo Jacob Vera"), "Nicolás");
  assertEquals(firstName(""), "");
});

Deno.test("buildGreeting copy", () => {
  const g = buildGreeting("PEREZ SOTO JUAN ANDRES");
  assertEquals(g.title, "¡Feliz cumpleaños, Juan!");
  assertEquals(g.emailSubject, "¡Feliz cumpleaños, Juan!");
  assertEquals(g.pushBody, "Hoy queremos saludarte de corazón y agradecerte por creer en la libertad.");
  assert(g.inboxBody.endsWith("\n\nDirectiva Regional PNL Biobío"));
  assert(g.emailHtml.includes("¡Feliz cumpleaños, Juan! 🎉"));
  assert(g.emailHtml.includes("https://nacionallibertariobiobio.cl/forja-eventos.html?inbox=1"));
  assert(g.emailHtml.includes("/assets/images/cumpleanos/feliz-cumpleanos.jpg"));
  assert(g.emailText.includes("Directiva Regional PNL Biobío"));
});

Deno.test("buildGreeting escapes HTML", () => {
  assert(!buildGreeting("<script>").emailHtml.includes("<script>"));
  assert(!buildGreeting("<b> <i> <script>alert(1)</script>").emailHtml.includes("<script>"));
});

Deno.test("buildGreeting without a name has no dangling comma", () => {
  const g = buildGreeting("PEREZ SOTO");
  assertEquals(g.title, "¡Feliz cumpleaños!");
  assertEquals(g.emailSubject, "¡Feliz cumpleaños!");
  assert(g.emailHtml.includes("¡Feliz cumpleaños! 🎉"));
});

Deno.test("pushNeedsSend retries pending and failed only", () => {
  assert(pushNeedsSend("pending"));
  assert(pushNeedsSend("failed"));
  assert(!pushNeedsSend("sent"));
  assert(!pushNeedsSend("no_subscription"));
});

Deno.test("emailNeedsSend retries pending, failed and skipped_quota only", () => {
  assert(emailNeedsSend("pending"));
  assert(emailNeedsSend("failed"));
  assert(emailNeedsSend("skipped_quota"));
  assert(!emailNeedsSend("sent"));
  assert(!emailNeedsSend("no_email"));
});

Deno.test("isGreetingComplete needs the inbox row plus final push and email statuses", () => {
  const done = { inbox_log_id: "x", push_status: "sent", email_status: "sent" };
  assert(isGreetingComplete(done));
  assert(isGreetingComplete({ inbox_log_id: "x", push_status: "no_subscription", email_status: "no_email" }));
  assert(!isGreetingComplete({ ...done, inbox_log_id: null }));
  assert(!isGreetingComplete({ ...done, push_status: "pending" }));
  assert(!isGreetingComplete({ ...done, push_status: "failed" }));
  assert(!isGreetingComplete({ ...done, email_status: "pending" }));
  assert(!isGreetingComplete({ ...done, email_status: "failed" }));
  assert(!isGreetingComplete({ ...done, email_status: "skipped_quota" }));
});
