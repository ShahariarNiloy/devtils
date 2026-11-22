import type { BlogPost, Span } from "../types";

const strong = (v: string): Span => ({ t: "strong", v });
const em = (v: string): Span => ({ t: "em", v });
const code = (v: string): Span => ({ t: "code", v });
const a = (v: string, href: string): Span => ({ t: "link", v, href });

export const post: BlogPost = {
  slug: "curl-to-code-gotchas",
  title: "Copy as cURL, then what? 9 things that break when curl becomes code",
  seoTitle: "curl to code: 9 things that break in translation",
  description:
    "Turning a copied curl command into fetch, Python or Go looks mechanical. It isn't: redirects, timeouts, repeated parameters, browser-only headers and shell quoting all change meaning on the way.",
  seoDescription:
    "Redirects, timeouts, repeated parameters, browser-blocked headers and shell quoting all change meaning when a curl command becomes fetch, Python or Go.",
  date: "2026-11-22",
  author: "The utilyx team",
  tags: ["Web", "HTTP", "JavaScript"],
  readingTime: "9 min",
  cover: "curl",
  tool: { name: "cURL to code", glyph: "$_", tint: "teal", href: "/tools/curl-to-code" },
  blocks: [
    {
      k: "p",
      s: [
        "Most API debugging ends the same way. The request works in the browser, so you open DevTools, right-click it, choose ",
        strong("Copy as cURL"),
        ", paste it into a terminal, and it works there too. Then you rewrite it as ",
        code("fetch()"),
        " or ",
        code("requests.post()"),
        " and something is off: a 401, a filter that's ignored, a request that never finishes.",
      ],
    },
    {
      k: "p",
      s: [
        "The translation looks mechanical. A ",
        code("-H"),
        " becomes a header, a ",
        code("-d"),
        " becomes a body. But curl and HTTP libraries disagree about defaults in a handful of places, and each disagreement changes the request you actually send. These are the nine we hit while building our ",
        a("cURL converter", "/tools/curl-to-code"),
        ", with what each one does and how to get curl's behaviour back.",
      ],
    },

    { k: "h2", v: "1. Redirects: curl stops, everything else follows", id: "redirects" },
    {
      k: "p",
      s: [
        "Without ",
        code("-L"),
        ", curl doesn't follow redirects. It prints the 301 or 302 response and stops. Almost every HTTP library does the opposite: ",
        code("fetch"),
        " follows by default, Python's requests follows for every method except HEAD, Go's ",
        code("http.Client"),
        " follows up to 10 hops, and Guzzle follows up to 5.",
      ],
    },
    {
      k: "p",
      s: [
        "That matters most for writes. When a POST gets a 301, 302 or 303, a following client repeats the request to the new location as a ",
        strong("GET without the body"),
        ". So a command that answered “302 Found” in your terminal can “succeed” in code by landing on a login page. If you want to see the redirect, ask for it:",
      ],
    },
    {
      k: "code",
      lang: "js",
      v: 'const res = await fetch(url, { method: "POST", body, redirect: "manual" });',
    },
    { k: "code", lang: "python", v: "response = requests.post(url, data=data, allow_redirects=False)" },

    { k: "h2", v: "2. The same timeout means different things", id: "timeouts" },
    {
      k: "p",
      s: [
        code("-m 30"),
        " (",
        code("--max-time"),
        ") is a deadline for the whole transfer. The libraries start from a worse place: ",
        code("fetch"),
        " has no timeout at all, requests waits forever unless you pass ",
        code("timeout="),
        ", and Go's default client never gives up. A converter that drops ",
        code("-m"),
        " hands you code that can hang.",
      ],
    },
    {
      k: "p",
      s: [
        "Even when the number carries over, it may not mean the same thing. In requests, ",
        code("timeout=30"),
        " limits connecting and each wait ",
        em("between"),
        " bytes of the response, not the total. A server that trickles a byte every 20 seconds keeps the call alive indefinitely.",
      ],
    },
    {
      k: "table",
      head: [["Client"], ["Default"], [code("-m 30"), " becomes"], ["What it limits"]],
      rows: [
        [["fetch"], ["No timeout"], [code("signal: AbortSignal.timeout(30000)")], ["The whole request"]],
        [["Python requests"], ["Waits forever"], [code("timeout=30")], ["Connecting, and each wait between reads"]],
        [["Go net/http"], ["Never times out"], [code("http.Client{Timeout: 30 * time.Second}")], ["The whole exchange, body included"]],
        [["PHP Guzzle"], ["Waits forever"], [code("'timeout' => 30")], ["The whole request"]],
      ],
    },

    { k: "h2", v: "3. Repeated parameters vanish in dictionaries", id: "repeated-parameters" },
    {
      k: "p",
      s: [
        code("?tag=a&tag=b"),
        " is one parameter with two values, and APIs use it for filters all the time. curl sends both. Convert it to a dictionary and the second silently wins, because a dict can't hold the same key twice:",
      ],
    },
    {
      k: "code",
      lang: "python",
      v: '# Sends only tag=b\nrequests.get(url, params={"tag": "a", "tag": "b"})\n\n# Sends both\nrequests.get(url, params=[("tag", "a"), ("tag", "b")])',
    },
    {
      k: "p",
      s: [
        "JavaScript object literals and PHP arrays behave the same way. Use ",
        code('new URLSearchParams([["tag", "a"], ["tag", "b"]])'),
        " in JavaScript, and a plain query string in Guzzle's ",
        code("'query'"),
        " option. The same applies to repeated ",
        code("-d tag=a -d tag=b"),
        " form fields.",
      ],
    },

    { k: "h2", v: "4. Some headers are off-limits in the browser", id: "forbidden-headers" },
    {
      k: "p",
      s: [
        "A command copied from DevTools carries everything the browser sent, including ",
        code("Cookie"),
        ", ",
        code("Origin"),
        " and ",
        code("Referer"),
        ". Paste those into ",
        code("fetch"),
        " on a web page and the browser quietly drops them: they're ",
        a("forbidden request headers", "https://developer.mozilla.org/en-US/docs/Glossary/Forbidden_request_header"),
        ", and setting one isn't an error, it just doesn't happen. The request works from curl and Node, then fails with a 401 in the browser.",
      ],
    },
    {
      k: "p",
      s: ["In a page, let the browser attach its own cookies instead:"],
    },
    { k: "code", lang: "js", v: 'const res = await fetch(url, { credentials: "include" });' },
    {
      k: "p",
      s: [
        "One more header to leave alone: when the body is ",
        code("FormData"),
        ", don't set ",
        code("Content-Type"),
        ". The browser adds it with the multipart boundary, and a hand-written value without the boundary breaks the upload.",
      ],
    },

    { k: "h2", v: "5. @ means “read a file” — except when it doesn't", id: "at-sign" },
    {
      k: "p",
      s: [
        "In curl, ",
        code("-d @body.json"),
        " doesn't send the text “@body.json”. It reads the file, and with ",
        code("-d"),
        " it also strips newlines (",
        code("--data-binary @body.json"),
        " sends the file byte for byte). ",
        code("--data-urlencode msg@note.txt"),
        " reads a file too, and ",
        code("-F photo=@cat.png"),
        " uploads one.",
      ],
    },
    {
      k: "p",
      s: [
        "Two flags exist precisely to turn that off: ",
        code("--data-raw"),
        " and ",
        code("--form-string"),
        " send a leading ",
        code("@"),
        " as a literal character. A converter that treats every ",
        code("-d"),
        " the same either sends a file name as your body or misses that a file was meant. Code can't read a file you haven't given it, so the honest output is a warning plus a body you fill in.",
      ],
    },

    { k: "h2", v: "6. -d quietly picks the method and the content type", id: "data-defaults" },
    {
      k: "p",
      s: [
        "Any ",
        code("-d"),
        " makes curl send a POST with ",
        code("Content-Type: application/x-www-form-urlencoded"),
        ", unless you set a type yourself. That catches people who paste JSON with ",
        code("-d"),
        " and no header: the server receives JSON labelled as a form, and a strict API rejects it. When you convert, decide which one you meant and say so in the headers.",
      ],
    },
    {
      k: "p",
      s: [code("-G"), " flips it the other way: the ", code("-d"), " values go into the query string and the request stays a GET."],
    },
    {
      k: "code",
      lang: "bash",
      v: "curl -G https://api.example.com/search -d q=curl -d per_page=5\n# sends: GET /search?q=curl&per_page=5",
    },

    { k: "h2", v: "7. Three shells, three quoting languages", id: "quoting" },
    {
      k: "p",
      s: [
        "The command you copied is written for one shell. In bash, single quotes are completely literal, while double quotes expand ",
        code("$TOKEN"),
        " and backslash escapes. That's why ",
        code('-H "Authorization: Bearer $TOKEN"'),
        " works in a terminal: the shell filled in the variable. A converter that copies the string literally sends the word ",
        code("$TOKEN"),
        " to the API; the right translation reads the same environment variable.",
      ],
    },
    {
      k: "p",
      s: [
        "On Windows, Chrome offers ",
        strong("Copy as cURL (cmd)"),
        ", which escapes nearly every special character with a caret:",
      ],
    },
    {
      k: "code",
      lang: "cmd",
      v: 'curl ^"https://app.example.com/api/orders?page=2^&status=open^" ^\n  -H ^"accept: application/json^"',
    },
    {
      k: "p",
      s: [
        "And in Windows PowerShell 5.1, ",
        code("curl"),
        " isn't curl at all — it's an alias for ",
        code("Invoke-WebRequest"),
        ", which takes different options. Type ",
        code("curl.exe"),
        " to run the real thing, and use a backtick, not a backslash, to continue a line.",
      ],
    },

    { k: "h2", v: "8. Big numbers don't survive JSON.parse", id: "big-numbers" },
    {
      k: "p",
      s: [
        "IDs from databases and payment systems often exceed 2⁵³, the largest integer a JavaScript number holds exactly. A converter that parses the JSON body and writes it back out changes the request:",
      ],
    },
    {
      k: "code",
      lang: "js",
      v: 'JSON.stringify(JSON.parse(\'{"id":12345678901234567890}\'))\n// \'{"id":12345678901234567000}\'',
    },
    {
      k: "p",
      s: [
        "Your code now asks for a different record, and nothing errors. Python's integers have no such limit, so a ",
        code("json="),
        " payload is safe there; in JavaScript and PHP, send the original JSON text as the body when a number is that large.",
      ],
    },

    { k: "h2", v: "9. The token you just pasted", id: "secrets" },
    {
      k: "p",
      s: [
        "Copy as cURL includes everything: session cookies, ",
        code("Authorization"),
        " headers, CSRF tokens. Paste it into code and the next ",
        code("git commit"),
        " publishes them. Read secrets from the environment instead — ",
        code("process.env.API_TOKEN"),
        ", ",
        code('os.environ["API_TOKEN"]'),
        ", ",
        code('os.Getenv("API_TOKEN")'),
        " — and be careful where you paste the command in the first place. A converter that posts your command to a server has just received a working session.",
      ],
    },

    { k: "h2", v: "A short checklist", id: "checklist" },
    {
      k: "ul",
      items: [
        ["No ", code("-L"), "? Decide whether your code should follow redirects, especially after a POST."],
        ["Set a timeout explicitly, and check what your library's timeout actually limits."],
        ["Repeated query or form names need pairs, not a dictionary."],
        ["Running in a browser? Drop ", code("Cookie"), " and use ", code('credentials: "include"'), "."],
        ["Any ", code("@"), " in a ", code("-d"), " or ", code("-F"), " value means a file your code must read."],
        ["JSON body without a ", code("Content-Type"), "? curl sent it as a form."],
        [code("$VAR"), " in double quotes is an environment variable, not text."],
        ["IDs over 2⁵³ go as text in JavaScript and PHP."],
        ["Tokens and cookies belong in environment variables, not in the code."],
      ],
    },
    {
      k: "p",
      s: [
        "Our ",
        a("cURL to code converter", "/tools/curl-to-code"),
        " takes care of the mechanical ones: it keeps repeated parameters, reads ",
        code("$VARS"),
        " in headers and every token or cookie from the environment, flags file references, ",
        code("-k"),
        " and browser-blocked headers, keeps big numbers exact, carries ",
        code("-m"),
        " over as a timeout, and understands bash, cmd and PowerShell commands. Redirects it leaves to your library's default, because only you know whether that POST should follow one. It writes ",
        a("fetch", "/tools/curl-to-fetch"),
        ", ",
        a("axios", "/tools/curl-to-axios"),
        ", ",
        a("Python", "/tools/curl-to-python"),
        ", ",
        a("Go", "/tools/curl-to-go"),
        " and ",
        a("PHP", "/tools/curl-to-php"),
        ", and the ",
        a("cURL generator", "/tools/curl-generator"),
        " goes the other way, from a form to a command quoted correctly for your shell. Everything runs in your browser tab; the command is never uploaded.",
      ],
    },
  ],
};
