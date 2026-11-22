import type { BlogPost, Span } from "../types";

const strong = (v: string): Span => ({ t: "strong", v });
const em = (v: string): Span => ({ t: "em", v });
const code = (v: string): Span => ({ t: "code", v });
const a = (v: string, href: string): Span => ({ t: "link", v, href });

export const post: BlogPost = {
  slug: "unix-timestamps-time-zones",
  title: "Unix timestamps and time zones: the bugs that keep biting",
  description:
    "Seconds vs milliseconds, date-only strings parsed as UTC, DST hours that don't exist, and 2038. Every example run, with the fix for each.",
  date: "2026-11-21",
  author: "The utilyx team",
  tags: ["Time", "JavaScript", "Databases"],
  readingTime: "8 min",
  cover: "time",
  tool: { name: "Timestamp converter", glyph: "ts", tint: "clay", href: "/tools/timestamp-converter" },
  blocks: [
    {
      k: "p",
      s: [
        "A user in Los Angeles reports that their birthday shows up one day early. You check the database: ",
        code("2026-11-21"),
        ". You check the API response: ",
        code("2026-11-21"),
        ". You open the page from your desk in Dhaka and it says the 21st. Nothing is wrong, except for everyone west of Greenwich.",
      ],
    },
    {
      k: "p",
      s: [
        "Almost every time bug comes from the same mistake: treating ",
        strong("an instant"),
        " (one moment, the same everywhere) and ",
        strong("a wall-clock time"),
        " (what a clock on a particular wall shows) as the same thing. Unix timestamps are instants. Strings like ",
        code("2026-11-21T09:00"),
        " are wall-clock times. The bugs live at the conversion between them.",
      ],
    },
    {
      k: "note",
      s: [
        "Every example below was run on Node.js 26.13.1 and Python 3.14. Each one states the ",
        code("TZ"),
        " it ran under, because the output depends on it. That is rather the point.",
      ],
    },

    { k: "h2", v: "What a Unix timestamp actually counts", id: "what-a-unix-timestamp-counts" },
    {
      k: "p",
      s: [
        "A Unix timestamp is the number of seconds since ",
        code("1970-01-01T00:00:00Z"),
        ", the epoch. It has no time zone. ",
        code("1795255200"),
        " is the same moment in Tokyo and in Lima; only the way you display it changes.",
      ],
    },
    {
      k: "p",
      s: [
        "What it doesn't count is leap seconds. POSIX defines \"seconds since the Epoch\" with a fixed formula and says plainly that \"each and every day shall be accounted for by exactly 86400 seconds\" (",
        a("POSIX.1-2024, Base Definitions §4.19", "https://pubs.opengroup.org/onlinepubs/9799919799/basedefs/V1_chap04.html"),
        "). There have been 27 leap seconds since 1972, the last one at the end of 2016. Unix time pretends none of them happened:",
      ],
    },
    {
      k: "code",
      lang: "bash",
      v: `$ TZ=UTC node -e 'console.log((Date.UTC(2017,0,1) - Date.UTC(2016,11,31)) / 1000)'
86400
$ TZ=UTC node -e 'console.log(new Date("2016-12-31T23:59:60Z").getTime())'
NaN`,
    },
    {
      k: "p",
      s: [
        "That last day of 2016 really lasted 86,401 seconds, and ",
        code("23:59:60"),
        " was a real UTC time. JavaScript's ",
        code("Date"),
        " can't represent it at all. For almost all application code this is a feature: every day has the same length, so date arithmetic stays simple. It only matters if you subtract timestamps across a leap second and need the answer exact to the second. If you do, Unix time is the wrong clock.",
      ],
    },

    { k: "h2", v: "Seconds, milliseconds or microseconds? Count the digits", id: "seconds-or-milliseconds" },
    {
      k: "p",
      s: [
        "Unix time is defined in seconds, but the unit you actually receive depends on who produced it. JavaScript's ",
        code("Date.now()"),
        " returns milliseconds. Python's ",
        code("time.time()"),
        " returns float seconds. Postgres stores timestamps at microsecond resolution, and Go's ",
        code("UnixNano()"),
        " and OpenTelemetry use nanoseconds. Hand the wrong one to ",
        code("new Date()"),
        ", which expects milliseconds, and you get a valid-looking date that's wildly wrong:",
      ],
    },
    {
      k: "code",
      lang: "bash",
      v: `$ TZ=UTC node -e 'console.log(new Date(1795255200).toISOString())'          # seconds
1970-01-21T18:40:55.200Z
$ TZ=UTC node -e 'console.log(new Date(1795255200000).toISOString())'       # milliseconds
2026-11-21T10:00:00.000Z
$ TZ=UTC node -e 'console.log(new Date(1795255200000000).toISOString())'    # microseconds
+058859-05-16T16:00:00.000Z`,
    },
    {
      k: "p",
      s: [
        "If a date lands in January 1970, you passed seconds where milliseconds were expected. If it lands in the year 58,859, you passed microseconds. Both are worth recognising on sight.",
      ],
    },
    {
      k: "p",
      s: [
        "For present-day dates the digit count tells you the unit. Every instant from ",
        code("2001-09-09T01:46:40Z"),
        " (",
        code("1000000000"),
        ") to ",
        code("2286-11-20T17:46:39Z"),
        " (",
        code("9999999999"),
        ") is exactly 10 digits in seconds, so 13 digits means milliseconds, 16 means microseconds and 19 means nanoseconds:",
      ],
    },
    {
      k: "code",
      lang: "js",
      v: `// Guess an epoch value's unit from its digit count. Takes a string, because
// nanosecond values (19 digits) don't fit in a JS number exactly.
// Only valid for instants between 2001-09-09 and 2286-11-20.
function epochToDate(text) {
  const digits = text.replace(/^-/, "").length;
  const n = BigInt(text);
  if (digits <= 10) return new Date(Number(n * 1000n));  // seconds
  if (digits <= 13) return new Date(Number(n));          // milliseconds
  if (digits <= 16) return new Date(Number(n / 1000n));  // microseconds
  return new Date(Number(n / 1000000n));                 // nanoseconds
}

for (const t of ["1795255200", "1795255200000", "1795255200000000", "1795255200000000000"]) {
  console.log(t.padEnd(20), epochToDate(t).toISOString());
}`,
    },
    {
      k: "code",
      lang: "text",
      v: `$ TZ=UTC node unit.js
1795255200           2026-11-21T10:00:00.000Z
1795255200000        2026-11-21T10:00:00.000Z
1795255200000000     2026-11-21T10:00:00.000Z
1795255200000000000  2026-11-21T10:00:00.000Z`,
    },
    {
      k: "p",
      s: [
        "This is a heuristic for reading logs and payloads, not a substitute for knowing your units. It breaks for dates before 2001, and a 19-digit nanosecond value usually can't pass through ",
        code("JSON.parse"),
        " without losing its last few digits, which is why the function takes a string. Our ",
        a("timestamp converter", "/tools/timestamp-converter"),
        " uses the same digit-count detection and shows which unit it assumed, so you can see when the guess is wrong.",
      ],
    },
    {
      k: "p",
      s: [
        strong("The fix:"),
        " put the unit in the name. ",
        code("created_at_ms"),
        " or ",
        code("expiresAtSeconds"),
        " costs nothing and stops the bug at code review. JWTs are a famous case: ",
        code("exp"),
        " is seconds, ",
        code("Date.now()"),
        " is milliseconds, and the comparison is wrong by a factor of 1,000 until someone multiplies.",
      ],
    },

    { k: "h2", v: "JavaScript's Date parser has two rules, and you need both", id: "javascript-date-parsing" },
    { k: "p", s: ["Here's the birthday bug from the top of this post, reproduced:"] },
    {
      k: "code",
      lang: "js",
      v: `const d = new Date("2026-11-21");
console.log(d.getDate(), d.toLocaleDateString("en-US"));`,
    },
    {
      k: "code",
      lang: "text",
      v: `$ TZ=America/Los_Angeles node day.js
20 11/20/2026
$ TZ=Asia/Dhaka node day.js
21 11/21/2026`,
    },
    {
      k: "p",
      s: [
        "The spec is explicit about why. ECMA-262 (",
        a("§21.4.1.32, Date Time String Format", "https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-date-time-string-format"),
        "): \"When the UTC offset representation is absent, date-only forms are interpreted as a UTC time and date-time forms are interpreted as a local time.\" So ",
        code("2026-11-21"),
        " is midnight UTC, which is 16:00 on the 20th in Los Angeles. Add a time and the same date flips to local:",
      ],
    },
    {
      k: "code",
      lang: "js",
      v: `const inputs = ["2026-11-21", "2026-11-21T00:00", "2026-11-21T00:00Z", "2026-11-21 00:00", "11/21/2026"];
for (const s of inputs) {
  console.log(s.padEnd(20), new Date(s).toISOString());
}`,
    },
    {
      k: "code",
      lang: "text",
      v: `$ TZ=America/Los_Angeles node parse.js
2026-11-21           2026-11-21T00:00:00.000Z
2026-11-21T00:00     2026-11-21T08:00:00.000Z
2026-11-21T00:00Z    2026-11-21T00:00:00.000Z
2026-11-21 00:00     2026-11-21T08:00:00.000Z
11/21/2026           2026-11-21T08:00:00.000Z

$ TZ=Asia/Dhaka node parse.js
2026-11-21           2026-11-21T00:00:00.000Z
2026-11-21T00:00     2026-11-20T18:00:00.000Z
2026-11-21T00:00Z    2026-11-21T00:00:00.000Z
2026-11-21 00:00     2026-11-20T18:00:00.000Z
11/21/2026           2026-11-20T18:00:00.000Z`,
    },
    {
      k: "p",
      s: [
        "Only the rows with ",
        code("Z"),
        " or with no time at all give the same instant on both machines. The last two rows aren't in the spec's format, so their meaning is implementation-defined; V8 reads them as local time, but you shouldn't build on that.",
      ],
    },
    {
      k: "p",
      s: [
        strong("The fix:"),
        " decide what the value ",
        em("is"),
        ". A birthday or a due date is a calendar date with no time zone, so don't turn it into a ",
        code("Date"),
        " at all: keep the string, or use ",
        code("Temporal.PlainDate"),
        ". An instant should always travel with its offset (",
        code("Z"),
        " or ",
        code("+06:00"),
        "). If you must display a date-only value with ",
        code("Date"),
        ", format it with ",
        code('{ timeZone: "UTC" }'),
        " so the day can't shift.",
      ],
    },

    { k: "h2", v: "A local time without an offset is not a moment", id: "local-time-without-offset" },
    {
      k: "p",
      s: [
        "The database version of the same bug: a column holds ",
        code("2026-11-21 09:00:00"),
        " with no offset. Which 09:00? Whatever the reader assumes. Here is the identical string read by a server on UTC and a laptop in Dhaka:",
      ],
    },
    {
      k: "code",
      lang: "bash",
      v: `$ TZ=UTC node -e 'console.log(new Date("2026-11-21T09:00:00").toISOString())'
2026-11-21T09:00:00.000Z
$ TZ=Asia/Dhaka node -e 'console.log(new Date("2026-11-21T09:00:00").toISOString())'
2026-11-21T03:00:00.000Z`,
    },
    {
      k: "p",
      s: [
        "Six hours apart, and nothing errors. This usually shows up when a team that has always run everything in one zone adds a second region, a CI runner on UTC, or a developer abroad.",
      ],
    },
    {
      k: "p",
      s: [
        "In Postgres, this is the difference between ",
        code("timestamp"),
        " and ",
        code("timestamptz"),
        ". Despite its name, ",
        code("timestamptz"),
        " doesn't store a zone. It converts the input to a UTC instant on the way in and back to the session's ",
        code("TimeZone"),
        " on the way out. That is what you want for \"when did this happen\". Plain ",
        code("timestamp"),
        " stores the wall-clock digits and nothing else.",
      ],
    },

    { k: "h2", v: "Daylight saving: times that don't exist, and times that happen twice", id: "dst-gaps-and-overlaps" },
    {
      k: "p",
      s: [
        "In New York, clocks jump from 02:00 to 03:00 on Sunday 8 March 2026. The local time 02:30 that day never happens. On Sunday 1 November 2026 they fall back from 02:00 to 01:00, so 01:30 happens twice, an hour apart. Any code that turns a wall-clock time into an instant has to decide what to do with both. Temporal makes you choose:",
      ],
    },
    {
      k: "code",
      lang: "js",
      v: `const tz = "America/New_York";
const wall = { year: 2026, month: 3, day: 8, hour: 2, minute: 30, timeZone: tz };

// Default ("compatible"): a time in the gap is pushed forward by the gap length.
console.log(Temporal.ZonedDateTime.from(wall).toString());

// Ask Temporal to refuse instead of guessing.
try {
  Temporal.ZonedDateTime.from(wall, { disambiguation: "reject" });
} catch (e) {
  console.log(\`\${e.name}: \${e.message}\`);
}

// The fall-back overlap: 01:30 on 1 November happens twice.
const twice = { year: 2026, month: 11, day: 1, hour: 1, minute: 30, timeZone: tz };
console.log(Temporal.ZonedDateTime.from(twice, { disambiguation: "earlier" }).toString());
console.log(Temporal.ZonedDateTime.from(twice, { disambiguation: "later" }).toString());`,
    },
    {
      k: "code",
      lang: "text",
      v: `$ TZ=UTC node gap.js
2026-03-08T03:30:00-04:00[America/New_York]
RangeError: Temporal error: Rejecting ambiguous time zones.
2026-11-01T01:30:00-04:00[America/New_York]
2026-11-01T01:30:00-05:00[America/New_York]`,
    },
    {
      k: "p",
      s: [
        "The legacy ",
        code("Date"),
        " API makes the same choice silently. Under ",
        code("TZ=America/New_York"),
        ", ",
        code("new Date(2026, 2, 8, 2, 30)"),
        " prints ",
        code("Sun Mar 08 2026 03:30:00 GMT-0400 (Eastern Daylight Time)"),
        ", with no way to ask it to refuse. Python is more surprising. It accepts the nonexistent time and gives it an offset:",
      ],
    },
    {
      k: "code",
      lang: "python",
      v: `from datetime import datetime, timezone
from zoneinfo import ZoneInfo

ny = ZoneInfo("America/New_York")

# 02:30 on 8 March 2026 doesn't exist in New York.
t = datetime(2026, 3, 8, 2, 30, tzinfo=ny)
print(t.isoformat())
# Round-trip through UTC to see what it really means:
print(t.astimezone(timezone.utc).astimezone(ny).isoformat())

# 01:30 on 1 November 2026 exists twice; \`fold\` picks which one.
print(datetime(2026, 11, 1, 1, 30, tzinfo=ny, fold=0).isoformat())
print(datetime(2026, 11, 1, 1, 30, tzinfo=ny, fold=1).isoformat())`,
    },
    {
      k: "code",
      lang: "text",
      v: `$ TZ=UTC python3 gap.py
2026-03-08T02:30:00-05:00
2026-03-08T03:30:00-04:00
2026-11-01T01:30:00-04:00
2026-11-01T01:30:00-05:00`,
    },
    {
      k: "p",
      s: [
        "The first line is a timestamp that no clock in New York ever showed. It only becomes a real local time after a round trip through UTC. If you validate user input like \"send at 02:30\", do it with something that can reject, and tell the user why.",
      ],
    },
    {
      k: "p",
      s: [
        "Scheduled jobs are where this bites hardest. In New York, a daily job at 02:30 falls into the March gap, so it is skipped or shifted that day. One at 01:30 falls into the November overlap and, depending on the scheduler, can run twice. Either schedule in UTC or keep jobs out of the 01:00 to 03:00 window.",
      ],
    },

    { k: "h2", v: "2038 is closer than your data's lifetime", id: "the-2038-problem" },
    {
      k: "p",
      s: [
        "A signed 32-bit integer tops out at 2,147,483,647. As Unix seconds, that's ",
        code("2038-01-19T03:14:07Z"),
        ". One second later, a 32-bit field wraps around to the most negative value, which is a date in 1901:",
      ],
    },
    {
      k: "code",
      lang: "js",
      v: `const max = 2 ** 31 - 1;
console.log(max, new Date(max * 1000).toISOString());

// One second later, stored in a signed 32-bit integer, wraps negative:
const wrapped = new Int32Array([max + 1])[0];
console.log(wrapped, new Date(wrapped * 1000).toISOString());

// The same bug, hiding in a common JS idiom: \`| 0\` truncates to int32.
const later = Date.UTC(2038, 0, 19, 3, 14, 8) / 1000;
console.log(later, later | 0, Math.floor(later));`,
    },
    {
      k: "code",
      lang: "text",
      v: `$ TZ=UTC node y2038.js
2147483647 2038-01-19T03:14:07.000Z
-2147483648 1901-12-13T20:45:52.000Z
2147483648 -2147483648 2147483648`,
    },
    {
      k: "p",
      s: [
        "JavaScript numbers are 64-bit floats, so ",
        code("Date"),
        " itself is fine. The danger is everything around it. ",
        code("(Date.now() / 1000) | 0"),
        " is a popular way to get whole seconds, and it breaks in January 2038 because bitwise operators work on 32-bit integers. Use ",
        code("Math.floor"),
        ". MySQL's ",
        code("TIMESTAMP"),
        " type is documented with a range of \"'1970-01-01 00:00:01' UTC to '2038-01-19 03:14:07' UTC\" (",
        a("MySQL 8.4 manual", "https://dev.mysql.com/doc/refman/8.4/en/datetime.html"),
        "); ",
        code("DATETIME"),
        " goes to year 9999. Binary formats with ",
        code("int32"),
        " time fields have the same ceiling.",
      ],
    },
    {
      k: "p",
      s: [
        "2038 sounds far away until you remember that a 15-year loan, certificate expiry or insurance policy written today already reaches past it.",
      ],
    },

    { k: "h2", v: "ISO 8601 vs RFC 3339", id: "iso-8601-vs-rfc-3339" },
    {
      k: "p",
      s: [
        "People use the two names interchangeably. They aren't the same. ISO 8601 is a large family of formats. ",
        a("RFC 3339", "https://www.rfc-editor.org/rfc/rfc3339"),
        " is a small profile of it for internet protocols, and its key rule is in the grammar (§5.6): ",
        code('date-time = full-date "T" full-time'),
        ", where ",
        code("full-time"),
        " requires a ",
        code("time-offset"),
        ". An RFC 3339 timestamp can't be ambiguous.",
      ],
    },
    {
      k: "table",
      head: [["Example"], ["ISO 8601"], ["RFC 3339"], [code("new Date()")]],
      rows: [
        [[code("2026-11-21T10:00:00Z")], ["Yes"], ["Yes"], ["Parses"]],
        [[code("2026-11-21 10:00:00Z")], ["No (needs the T)"], ["Allowed by a note in §5.6"], ["Parses"]],
        [[code("2026-11-21T10:00:00")], ["Yes (local time)"], ["No: offset required"], ["Parses as local"]],
        [[code("20261121T100000Z")], ["Yes (basic format)"], ["No"], ["Invalid Date"]],
        [[code("2026-W47-6")], ["Yes (week date)"], ["No"], ["Invalid Date"]],
      ],
    },
    {
      k: "p",
      s: [
        "Table rows are from ",
        code("TZ=UTC node formats.js"),
        " on Node 26. RFC 3339 also lets the ", code("T"), " and ", code("Z"), " be lowercase, and Node parses that too. Two more details worth knowing. RFC 3339 §4.3 gives ",
        code("-00:00"),
        " a special meaning: the UTC time is known but the local offset isn't. And RFC 3339 has no place for a zone name. ",
        a("RFC 9557", "https://www.rfc-editor.org/rfc/rfc9557"),
        " (2024) extends it with a bracketed suffix, ",
        code("2026-11-21T16:00:00+06:00[Asia/Dhaka]"),
        ", which is the format Temporal prints. ",
        code("Temporal.Instant.from()"),
        " is also strict in the useful way: it throws a ",
        code("RangeError"),
        " on ",
        code("2026-11-21T10:00:00"),
        " because a string without an offset isn't an instant.",
      ],
    },
    {
      k: "p",
      s: [
        strong("The fix:"),
        " send RFC 3339 with ",
        code("Z"),
        " or a numeric offset in every API, and reject anything else at the boundary. Being lenient about input formats is how a local time sneaks into a field that should only hold instants.",
      ],
    },

    { k: "h2", v: "What to store, and when", id: "what-to-store" },
    { k: "p", s: ["The rule that prevents nearly everything above depends on whether the event has already happened."] },
    {
      k: "ul",
      items: [
        [
          strong("Past events"),
          " (a login, an order, a log line): store the UTC instant. Unix milliseconds, ",
          code("timestamptz"),
          ", or an RFC 3339 string with ",
          code("Z"),
          ". Convert to local time only for display, at the very edge.",
        ],
        [
          strong("Future events in someone's local time"),
          " (a meeting, a store opening, a reminder at 09:00): store the wall-clock time and the IANA zone name, like ",
          code("America/New_York"),
          ". Compute the instant when you need it.",
        ],
        [
          strong("Calendar dates"),
          " (birthdays, due dates, holidays): store the date alone. Don't attach a time or a zone it doesn't have.",
        ],
      ],
    },
    {
      k: "p",
      s: [
        "Why not convert future events to UTC up front? Because the rules change. Mexico ended daylight saving time in most of the country in 2022, and the time zone database records it:",
      ],
    },
    {
      k: "code",
      lang: "python",
      v: `from datetime import datetime
from zoneinfo import ZoneInfo

mx = ZoneInfo("America/Mexico_City")
for year in (2022, 2023):
    print(datetime(year, 7, 1, 9, 0, tzinfo=mx).isoformat())`,
    },
    {
      k: "code",
      lang: "text",
      v: `$ TZ=UTC python3 mx.py
2022-07-01T09:00:00-05:00
2023-07-01T09:00:00-06:00`,
    },
    {
      k: "p",
      s: [
        "A 09:00 July meeting in Mexico City that someone booked in 2021 and saved as a UTC instant would show up at 08:00 once the rule changed. Stored as \"09:00, America/Mexico_City\", it's still at 09:00 after the tz database update. With Temporal, resolving the stored form is short:",
      ],
    },
    {
      k: "code",
      lang: "js",
      v: `// A 09:00 meeting in New York, stored the way it was agreed:
const stored = { local: "2027-03-15T09:00", zone: "America/New_York" };

// Resolve to an instant only when you need one (send a reminder, render a calendar).
const when = Temporal.PlainDateTime.from(stored.local)
  .toZonedDateTime(stored.zone, { disambiguation: "reject" });

console.log(when.toString());               // RFC 9557: offset + zone
console.log(when.toInstant().toString());   // the UTC instant, for comparing
console.log(when.withTimeZone("Asia/Dhaka").toPlainDateTime().toString());`,
    },
    {
      k: "code",
      lang: "text",
      v: `$ TZ=UTC node future.js
2027-03-15T09:00:00-04:00[America/New_York]
2027-03-15T13:00:00Z
2027-03-15T19:00:00`,
    },
    {
      k: "p",
      s: [
        "Store IANA names, never abbreviations. ",
        code("IST"),
        " is used for India, Ireland and Israel, and ",
        code("EST"),
        " doesn't say whether daylight saving applies. A fixed offset like ",
        code("-05:00"),
        " is fine for an instant, but it's not a zone: it can't tell you what the offset will be in July.",
      ],
    },
    {
      k: "p",
      s: [
        "Temporal is built into Node.js 26, which we used for this post. Check support in the browsers you target before using it on the client, or use the ",
        code("@js-temporal/polyfill"),
        " package.",
      ],
    },
    {
      k: "quote",
      s: [
        strong("Quick reference:"),
        " Unix time is UTC seconds with no leap seconds. Count digits to tell s/ms/µs/ns apart. Date-only strings parse as UTC, date-times without an offset as local. Reject DST gaps instead of guessing. Never truncate seconds with ",
        code("| 0"),
        ". Send RFC 3339 with an offset. Store instants for the past, wall time plus IANA zone for the future.",
      ],
    },
    {
      k: "p",
      s: [
        strong("Try it:"),
        " paste any epoch value or date string into the ",
        a("utilyx timestamp converter", "/tools/timestamp-converter"),
        " to see which unit it was read as and the same instant in UTC and your zone. It runs in your browser.",
      ],
    },
  ],
};
