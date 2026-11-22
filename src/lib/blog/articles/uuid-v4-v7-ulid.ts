import type { BlogPost, Span } from "../types";

const strong = (v: string): Span => ({ t: "strong", v });
const em = (v: string): Span => ({ t: "em", v });
const code = (v: string): Span => ({ t: "code", v });
const a = (v: string, href: string): Span => ({ t: "link", v, href });

const RFC = "https://www.rfc-editor.org/rfc/rfc9562.html";
const ULID_SPEC = "https://github.com/ulid/spec";
const PG_UUID_FUNCS = "https://www.postgresql.org/docs/18/functions-uuid.html";

export const post: BlogPost = {
  slug: "uuid-v4-v7-ulid",
  title: "UUID v4, UUID v7 or ULID? Picking an ID for your database",
  description:
    "What is inside each ID, why random keys make B-tree inserts slower (we measured 30x the page writes), v7's same-millisecond caveat, and what to store.",
  date: "2026-11-21",
  author: "The utilyx team",
  tags: ["Databases", "Engineering", "Reference"],
  readingTime: "10 min",
  cover: "uuid",
  tool: {
    name: "UUID generator",
    glyph: "id",
    tint: "sage",
    href: "/tools/uuid-generator",
  },
  blocks: [
    {
      k: "p",
      s: [
        'You picked UUIDs for primary keys because they can be generated anywhere: in the app, on the client, in three services at once, without asking the database for the next number. Then the table grew, inserts got slower than they had any right to be, and someone on the team said the word "fragmentation".',
      ],
    },
    {
      k: "p",
      s: [
        "They were probably right, and the fix is usually not to abandon UUIDs. It is to pick the kind whose bits are in a useful order. Our short answer: ",
        strong("use UUID v7 for database keys"),
        ", keep ",
        strong("v4"),
        " for identifiers that must reveal nothing, and reach for ",
        strong("ULID"),
        " only if you want its shorter string. Below: the bits, the math, and an insert benchmark you can rerun.",
      ],
    },
    { k: "h2", v: "What's inside each one", id: "whats-inside" },
    {
      k: "p",
      s: [
        "All three are 128 bits. The difference is how those bits are spent. UUIDs are specified by ",
        a("RFC 9562", RFC),
        " (May 2024), which obsoleted RFC 4122 and added versions 6, 7 and 8. Here are the two layouts that matter, from its §5.4 and §5.7, with one 32-bit row per line:",
      ],
    },
    {
      k: "code",
      lang: "text",
      v: `UUID v4 (RFC 9562 §5.4)
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                           random_a                            |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|          random_a             |  ver  |       random_b        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|var|                       random_c                            |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                           random_c                            |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

UUID v7 (RFC 9562 §5.7)
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                           unix_ts_ms                          |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|          unix_ts_ms           |  ver  |       rand_a          |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|var|                        rand_b                             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                            rand_b                             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+`,
    },
    {
      k: "p",
      s: [
        "Both spend 6 bits on fixed values: a 4-bit ",
        code("ver"),
        " field (",
        code("0100"),
        " for v4, ",
        code("0111"),
        " for v7) and a 2-bit ",
        code("var"),
        " field (",
        code("10"),
        "). That leaves v4 with ",
        strong("122 random bits"),
        ". v7 puts a ",
        strong("48-bit big-endian Unix timestamp in milliseconds"),
        " first, then 74 bits (",
        code("rand_a"),
        " 12, ",
        code("rand_b"),
        " 62) of randomness, some of which an implementation may use as a counter. In the familiar hex form you can read the layout directly:",
      ],
    },
    {
      k: "code",
      lang: "text",
      v: `v4  xxxxxxxx-xxxx-4xxx-Nxxx-xxxxxxxxxxxx   N is 8, 9, a or b (variant bits 10)
v7  tttttttt-tttt-7xxx-Nxxx-xxxxxxxxxxxx   t = 48-bit Unix time in ms`,
    },
    {
      k: "p",
      s: [
        "Generating a v7 is a few lines. Node 26.1 added ",
        code("crypto.randomUUIDv7()"),
        ", but if you're on an older version, or want to see the layout in code, here it is with no dependencies:",
      ],
    },
    {
      k: "code",
      lang: "js",
      v: 'import { randomFillSync } from "node:crypto";\n\nfunction uuidv7(ms = Date.now()) {\n  const b = randomFillSync(new Uint8Array(16));\n  // Bytes 0–5: 48-bit big-endian Unix time in milliseconds.\n  for (let i = 5; i >= 0; i--) {\n    b[i] = ms % 256;\n    ms = Math.floor(ms / 256);\n  }\n  b[6] = (b[6] & 0x0f) | 0x70; // version 7\n  b[8] = (b[8] & 0x3f) | 0x80; // variant 0b10\n  const h = Buffer.from(b).toString("hex");\n  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;\n}\n\nconsole.log(uuidv7());\nconsole.log(uuidv7());',
    },
    {
      k: "code",
      lang: "text",
      v: "01a1fee7-7b07-7aac-87ff-d0f09646cefe\n01a1fee7-7b08-75f0-89dd-9228aff37a5d",
    },
    {
      k: "p",
      s: [
        "The two IDs were created a millisecond apart, and it shows: they share the first eleven hex digits. That shared, increasing prefix is the entire point of v7.",
      ],
    },
    {
      k: "p",
      s: [
        a("ULID", ULID_SPEC),
        " predates v7 and has the same idea with a different budget: a 48-bit millisecond timestamp followed by ",
        strong("80 random bits"),
        ", with no version or variant bits. Its canonical form is 26 characters of Crockford base32 (10 for the time, 16 for the randomness), an alphabet that drops I, L, O and U to avoid misreading. Python 3.14 added ",
        code("uuid.uuid7()"),
        " to the standard library, and Node 26.1 and PostgreSQL 18 have built-ins too. None of the three generates ULIDs.",
      ],
    },
    { k: "h2", v: "Will a v4 ever collide?", id: "collisions" },
    {
      k: "p",
      s: [
        "With 122 random bits, the birthday bound gives the probability of at least one collision among ",
        em("n"),
        " IDs as approximately:",
      ],
    },
    { k: "code", lang: "text", v: "p ≈ 1 − e^(−n² / (2 · 2^122))" },
    {
      k: "p",
      s: [
        "We computed it for a few sizes (Python, using ",
        code("math.expm1"),
        " to keep precision at tiny values):",
      ],
    },
    {
      k: "table",
      head: [["IDs generated"], ["Chance of any collision"]],
      rows: [
        [["1 million"], ["9.4 × 10⁻²⁶"]],
        [["1 billion"], ["9.4 × 10⁻²⁰"]],
        [["1 trillion"], ["9.4 × 10⁻¹⁴"]],
        [["1 quadrillion (10¹⁵)"], ["9.4 × 10⁻⁸"]],
        [["2.7 × 10¹⁸"], ["50%"]],
      ],
    },
    {
      k: "p",
      s: [
        "Even odds take a billion IDs per second for about 86 years. Real v4 collisions come from broken randomness, such as a non-cryptographic generator or a VM snapshot restored twice, not from math. Use the platform's CSPRNG (",
        code("crypto.randomUUID()"),
        ", ",
        code("uuid.uuid4()"),
        ", ",
        code("gen_random_uuid()"),
        ") and keep the unique constraint a primary key gives you anyway.",
      ],
    },
    {
      k: "p",
      s: [
        "v7 and ULID can only collide within the same millisecond, so what matters is how many you create per millisecond. If an implementation fills all 74 v7 bits randomly, a million IDs inside one millisecond collide with probability about 2.6 × 10⁻¹¹; ULID's 80 bits give 4.1 × 10⁻¹³. Implementations that use some of those bits as a counter trade randomness for ordering, as we'll see below.",
      ],
    },
    { k: "h2", v: "Why random keys hurt a B-tree", id: "b-tree-locality" },
    {
      k: "p",
      s: [
        "Most databases keep a primary key in a B-tree: keys sorted across fixed-size pages (4 KiB in SQLite by default, 8 KiB in Postgres). Inserting a key means finding the one leaf page where it belongs in sort order and rewriting that page. When the page is full, it splits in two, and the parent page is rewritten to point at both.",
      ],
    },
    {
      k: "p",
      s: [
        "With time-ordered keys, every new key sorts after every existing one, so every insert lands on the same rightmost leaf. One page stays hot in memory, fills up, and the tree grows at its right edge. With random keys, each insert lands on a ",
        em("random"),
        " leaf. Ten thousand inserts touch thousands of different pages, each of which has to be read into memory if it isn't already cached, modified for one small row, and written back in full. That is write amplification: a 100-byte row costing a 4 KiB page write. Once the index outgrows memory, the reads cost real I/O too.",
      ],
    },
    {
      k: "p",
      s: [
        "RFC 9562 says as much in §6.11: time-ordered UUIDs benefit from greater database-index locality, and it puts the difference at ",
        em('"one order of magnitude or more"'),
        ". We wanted a number we could see, so we measured.",
      ],
    },
    { k: "h3", v: "The measurement" },
    {
      k: "p",
      s: [
        "Setup: SQLite 3.46.1 from Python 3.14.4, a ",
        code("WITHOUT ROWID"),
        " table (so the table ",
        em("is"),
        " the primary-key B-tree), 16-byte binary keys plus a 64-byte payload, inserted in transactions of 10,000 rows. The database file was on tmpfs on a laptop with an Intel Core i7-1355U, so this isolates the B-tree work from disk speed. To count page writes independently of hardware, the script turns off automatic WAL checkpoints and adds up the pages each commit writes to the write-ahead log:",
      ],
    },
    {
      k: "code",
      lang: "python",
      v: '# Python 3.14+ (uuid.uuid7)\nimport os, sqlite3, sys, time, uuid\n\nN = int(sys.argv[1]) if len(sys.argv) > 1 else 1_000_000\nBATCH = 10_000\n\ndef run(kind, make):\n    path = f"{kind}.db"\n    for p in (path, path + "-wal", path + "-shm"):\n        if os.path.exists(p): os.remove(p)\n    db = sqlite3.connect(path)\n    db.execute("PRAGMA journal_mode=WAL")\n    db.execute("PRAGMA wal_autocheckpoint=0")\n    db.execute("CREATE TABLE t (id BLOB PRIMARY KEY, payload TEXT) WITHOUT ROWID")\n    written = 0  # 4 KiB pages written to the WAL, summed over every commit\n    t0 = time.perf_counter()\n    for _ in range(N // BATCH):\n        rows = [(make(), "x" * 64) for _ in range(BATCH)]\n        db.executemany("INSERT INTO t VALUES (?, ?)", rows)\n        db.commit()\n        written += db.execute("PRAGMA wal_checkpoint(PASSIVE)").fetchone()[1]\n    elapsed = time.perf_counter() - t0\n    pages = db.execute("PRAGMA page_count").fetchone()[0]\n    db.close()\n    os.remove(path)\n    print(f"{kind}  {elapsed:5.1f} s  {N/elapsed:8,.0f} rows/s  final size {pages:6,} pages  "\n          f"pages written {written:9,}  ({written/pages:.1f}x final size)")\n\nprint(f"sqlite {sqlite3.sqlite_version}, python {sys.version.split()[0]}, {N:,} rows, batches of {BATCH:,}")\nrun("v4", lambda: uuid.uuid4().bytes)\nrun("v7", lambda: uuid.uuid7().bytes)',
    },
    {
      k: "code",
      lang: "text",
      v: "sqlite 3.46.1, python 3.14.4, 1,000,000 rows, batches of 10,000\nv4    7.3 s   137,627 rows/s  final size 24,425 pages  pages written   746,865  (30.6x final size)\nv7    2.1 s   481,940 rows/s  final size 24,422 pages  pages written    25,341  (1.0x final size)",
    },
    {
      k: "table",
      head: [
        ["Rows"],
        ["Key"],
        ["Insert time"],
        ["Pages written"],
        ["Written ÷ final size"],
      ],
      rows: [
        [["1 M"], ["UUID v4"], ["7.3 s"], ["746,865"], ["30.6×"]],
        [["1 M"], ["UUID v7"], ["2.1 s"], ["25,341"], ["1.0×"]],
        [["2 M"], ["UUID v4"], ["18.6 s"], ["1,943,480"], ["39.7×"]],
        [["2 M"], ["UUID v7"], ["4.1 s"], ["50,711"], ["1.0×"]],
      ],
    },
    {
      k: "p",
      s: [
        "The v7 run wrote each page about once: the data, and essentially nothing else. The v4 run wrote ",
        strong("30 times"),
        " more pages for the same million rows, about 7,500 pages per 10,000-row commit, and the ratio grew as the table did (40× at two million). Insert throughput was 3.5 to 4.5 times higher with v7, even though Python's ",
        code("uuid7()"),
        " is the slower generator (981 ns versus 583 ns per call in ",
        code("timeit"),
        ").",
      ],
    },
    {
      k: "p",
      s: [
        "What we did ",
        em("not"),
        " see: a size difference. Both final files were about 24,400 pages, and a separate run with SQLite's ",
        code("dbstat"),
        " table showed leaf pages 87% full for both. SQLite rebalances across neighboring pages on a split, so random inserts didn't leave it half-empty. Other engines split differently, so don't read our size result as universal.",
      ],
    },
    {
      k: "note",
      s: [
        strong("Limits of this test."),
        " It is SQLite, single-threaded, with the file in RAM. The write counts depend on batch size: smaller transactions rewrite the same hot pages more often. On disk, and once the index outgrows the cache, random keys also pay for reads, which this setup hides. Treat the 30× as a demonstration of the mechanism, not a prediction for your Postgres or MySQL cluster. Rerun the script on your own hardware; it takes under a minute.",
      ],
    },
    {
      k: "h2",
      v: "v7's caveat: ordering inside one millisecond",
      id: "monotonicity",
    },
    {
      k: "p",
      s: [
        "v7 is sorted by millisecond. Within a millisecond, a generator that fills the rest with random bits, like ours above, produces IDs in random order. Node's built-in does the same: its docs say the timestamp comes from a non-monotonic clock and is not guaranteed to be strictly increasing. On a fast machine most IDs share a millisecond with their neighbors:",
      ],
    },
    {
      k: "code",
      lang: "js",
      v: 'import { randomUUIDv7 } from "node:crypto"; // Node 26.1+\n\nconst ids = Array.from({ length: 10_000 }, () => randomUUIDv7());\nconst outOfOrder = ids.filter((id, i) => i > 0 && id < ids[i - 1]).length;\nconst millis = new Set(ids.map((id) => id.slice(0, 13))).size;\nconsole.log({ generated: ids.length, distinctMillis: millis, outOfOrder });',
    },
    {
      k: "code",
      lang: "text",
      v: "{ generated: 10000, distinctMillis: 9, outOfOrder: 5001 }",
    },
    {
      k: "p",
      s: [
        "Ten thousand IDs over 9 milliseconds, and half are smaller than the ID generated just before them. For an index that's mostly harmless: they still land on the same few pages at the right edge. It matters when code relies on ",
        code("ORDER BY id"),
        ' meaning "creation order", such as cursor pagination or event logs.',
      ],
    },
    {
      k: "p",
      s: [
        "RFC 9562 §6.2 describes three ways to fix this within one generator: a dedicated counter in the bits after the timestamp (Method 1), treating the random bits themselves as a number that is incremented by a random amount (Method 2), or spending up to 12 bits on sub-millisecond clock precision (Method 3). Real implementations differ:",
      ],
    },
    {
      k: "ul",
      items: [
        [
          strong("Python 3.14"),
          " uses Method 1: a 42-bit counter seeded randomly each millisecond and incremented within it, plus 32 fresh random bits. If the clock goes backwards, it uses one millisecond past the last timestamp instead. The same test in Python gives zero out-of-order IDs:",
        ],
      ],
    },
    {
      k: "code",
      lang: "python",
      v: 'import uuid  # Python 3.14+\n\nids = [str(uuid.uuid7()) for _ in range(10_000)]\nout_of_order = sum(b < a for a, b in zip(ids, ids[1:]))\nprint({"generated": len(ids), "distinct_millis": len({i[:13] for i in ids}), "out_of_order": out_of_order})',
    },
    {
      k: "code",
      lang: "text",
      v: "{'generated': 10000, 'distinct_millis': 16, 'out_of_order': 0}",
    },
    {
      k: "ul",
      items: [
        [
          strong("PostgreSQL 18"),
          "'s ",
          code("uuidv7()"),
          " uses Method 3, according to the comments in its source (",
          code("src/backend/utils/adt/uuid.c"),
          "), and guarantees each value is greater than the previous one ",
          strong("generated by the same backend"),
          ", meaning the same connection.",
        ],
        [
          strong("ULID"),
          "'s spec says to increment the random part by one within the same millisecond, and that generation fails if that ever overflows.",
        ],
      ],
    },
    {
      k: "p",
      s: [
        "The caveat none of them can lift: ordering holds ",
        strong("per generator"),
        ". Two app servers, two Postgres connections, or two worker processes each produce their own sequence, and their IDs interleave by clock, with whatever skew the clocks have. The RFC is explicit that its monotonicity methods are for a single node. If you need a total order across writers, use a sequence or a timestamp column and sort by that.",
      ],
    },
    { k: "h2", v: "ULID or UUID v7?", id: "ulid-vs-v7" },
    {
      k: "table",
      head: [[""], ["UUID v7"], ["ULID"]],
      rows: [
        [
          ["Specified by"],
          ["RFC 9562, an IETF standard"],
          ["A community spec on GitHub"],
        ],
        [["Timestamp"], ["48-bit Unix ms"], ["48-bit Unix ms"]],
        [["Remaining bits"], ["74 random or counter (6 fixed)"], ["80 random"]],
        [
          ["Text form"],
          ["36 chars, hex with hyphens"],
          ["26 chars, Crockford base32"],
        ],
        [
          ["Same-ms ordering"],
          ["Implementation's choice of three methods"],
          ["Increment by one; fails on overflow"],
        ],
        [
          ["Native DB type"],
          ["Any ", code("uuid"), " column"],
          ["None. Text, or 16 bytes that aren't a valid RFC UUID"],
        ],
      ],
    },
    {
      k: "p",
      s: [
        "Their sort behavior and index behavior are the same: both are a millisecond timestamp followed by noise. The real differences are the string and the ecosystem. A ULID is 10 characters shorter and avoids ambiguous letters, which is pleasant in URLs and support tickets. A v7 fits a native ",
        code("uuid"),
        " column, validates with every UUID parser you already have, and is now generated natively by Postgres 18, Python 3.14 and Node 26.1. You can store a ULID's 16 bytes in a ",
        code("uuid"),
        " column, but the version and variant positions will hold whatever random bits the ULID had there, so tools that read the version will report nonsense.",
      ],
    },
    {
      k: "p",
      s: [
        "For a new system we'd choose v7. If you already use ULIDs, there's no index reason to migrate.",
      ],
    },
    { k: "h2", v: "Your IDs say when the row was created", id: "privacy" },
    {
      k: "p",
      s: [
        "Anyone holding a v7 or a ULID can read its creation time. No key needed:",
      ],
    },
    {
      k: "code",
      lang: "js",
      v: 'const createdAt = (id) => new Date(parseInt(id.replace(/-/g, "").slice(0, 12), 16));\n\nconsole.log(createdAt("019535d9-3df7-79fb-b466-fa907fa17f9e").toISOString());',
    },
    { k: "code", lang: "text", v: "2025-02-24T02:46:24.503Z" },
    {
      k: "p",
      s: [
        "That ID is the example from the PostgreSQL 18 docs, and the decoded time matches the one they show for ",
        code("uuid_extract_timestamp()"),
        ". Often that's harmless. But put a v7 in a public URL and you publish when each user signed up or each order was placed. RFC 9562 §8 calls the embedded timestamp ",
        em('"a very small attack surface"'),
        " and notes that with a counter it ",
        em('"does signal the order of creation"'),
        ".",
      ],
    },
    {
      k: "p",
      s: [
        "The same section is firmer on a related point: UUIDs ",
        em('"MUST NOT be used as security capabilities"'),
        ", identifiers whose mere possession grants access, and implementations shouldn't assume they're hard to guess. Where an application does use UUIDs in a security-relevant role, it recommends v4. A practical split: v7 as the internal primary key, and a separate v4, or better, a purpose-built random token, for anything exposed in links, password resets or invitations.",
      ],
    },
    { k: "h2", v: "Store 16 bytes, not 36 characters", id: "storage" },
    {
      k: "p",
      s: [
        "The text form of a UUID is 36 characters for 16 bytes of information. RFC 9562 §6.13 says UUIDs ",
        em(
          '"SHOULD be stored within database applications as the underlying 128-bit binary value"',
        ),
        ", and calls text storage unnecessarily verbose: 288 bits to hold 128.",
      ],
    },
    {
      k: "p",
      s: [
        "In ",
        strong("PostgreSQL"),
        ", use the native ",
        code("uuid"),
        " type, which stores the 128-bit value. A ",
        code("text"),
        " column holding the same value takes 37 bytes (Postgres stores a short string as 1 byte plus the string). In ",
        strong("MySQL"),
        ", use ",
        code("BINARY(16)"),
        ". In ",
        strong("SQLite"),
        ", a ",
        code("BLOB"),
        ". The difference compounds, because the key is repeated in every index and every foreign key that references it. We measured a primary-key B-tree of a million v7 keys in SQLite:",
      ],
    },
    {
      k: "code",
      lang: "python",
      v: '# Python 3.14+ (uuid.uuid7)\nimport sqlite3, uuid\n\ndb = sqlite3.connect(":memory:")\ndb.execute("CREATE TABLE as_text (id TEXT PRIMARY KEY) WITHOUT ROWID")\ndb.execute("CREATE TABLE as_blob (id BLOB PRIMARY KEY) WITHOUT ROWID")\nids = [uuid.uuid7() for _ in range(1_000_000)]\ndb.executemany("INSERT INTO as_text VALUES (?)", ((str(u),) for u in ids))\ndb.executemany("INSERT INTO as_blob VALUES (?)", ((u.bytes,) for u in ids))\nfor name in ("as_text", "as_blob"):\n    pages = db.execute("SELECT count(*) FROM dbstat WHERE name = ?", (name,)).fetchone()[0]\n    print(f"{name}: {pages:,} pages ({pages * 4096 / 2**20:.1f} MiB) for 1,000,000 keys")',
    },
    {
      k: "code",
      lang: "text",
      v: "as_text: 11,509 pages (45.0 MiB) for 1,000,000 keys\nas_blob: 5,890 pages (23.0 MiB) for 1,000,000 keys",
    },
    {
      k: "p",
      s: [
        "Text also brings correctness traps. ",
        code("'A0EEBC99-…'"),
        " and ",
        code("'a0eebc99-…'"),
        " are the same UUID but different strings, so a text column can hold both and a lookup with the wrong case misses. A native ",
        code("uuid"),
        " column normalizes on input; Postgres accepts uppercase, braces and missing hyphens, and always outputs the standard lowercase form.",
      ],
    },
    {
      k: "p",
      s: [
        "PostgreSQL 18, released in September 2025, added ",
        a("uuidv7()", PG_UUID_FUNCS),
        " and an explicit ",
        code("uuidv4()"),
        " alias for ",
        code("gen_random_uuid()"),
        ". If you're on 18, the key can be generated by the database:",
      ],
    },
    {
      k: "code",
      lang: "sql",
      v: `CREATE TABLE orders (
  id         uuid PRIMARY KEY DEFAULT uuidv7(),
  total_cents bigint NOT NULL
);

-- Creation time, straight from the key (v1 and v7 only; NULL for others)
SELECT id, uuid_extract_timestamp(id) FROM orders;`,
    },
    {
      k: "p",
      s: [
        code("uuidv7()"),
        " also takes an optional ",
        code("interval"),
        " that shifts the embedded timestamp. On older versions, generate v7 in the application: a library for your language, a built-in like Node's, or the dozen lines above.",
      ],
    },
    { k: "h2", v: "What we'd pick", id: "what-we-d-pick" },
    {
      k: "ul",
      items: [
        [
          strong("Primary keys in a new system:"),
          " UUID v7, stored as native ",
          code("uuid"),
          " or 16 bytes.",
        ],
        [
          strong("IDs that leave your system and should reveal nothing:"),
          " v4. Not as an access token, though; use a real token for that.",
        ],
        [
          strong("Need strict creation order across many writers:"),
          " none of these. Sort by a sequence or a timestamp column.",
        ],
        [
          strong("Single database, no offline or client-side generation:"),
          " a plain ",
          code("bigint"),
          " identity column is still smaller and simpler than any of them.",
        ],
      ],
    },
    {
      k: "p",
      s: [
        "When you just need a few IDs for a fixture, a test or a curl command, the ",
        a("utilyx UUID generator", "/tools/uuid-generator"),
        " makes v4, v7 and ULIDs with ",
        code("crypto.getRandomValues"),
        ", and lets you paste one in to see its version, variant and embedded timestamp. One limit to know: a batch shares a single timestamp and is sorted after generation, rather than using a per-millisecond counter. That's fine for test data. For keys your database will index, generate them where the rows are written: in Postgres 18, or with your language's library.",
      ],
    },
  ],
};
