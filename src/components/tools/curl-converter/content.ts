import type { ToolContentProps } from "@/components/shared/tool-content";

/**
 * Copy for the seven cURL pages (from the design board): the cards and
 * FAQ under the tool, plus a search intro. Keyed by tool slug.
 */
export const CURL_SEO: Record<string, ToolContentProps> = {
  "curl-to-code": {
    intro:
      "Paste a curl command — from DevTools, Postman or an API's docs — and get the same request as fetch, axios, Python requests, Go net/http or PHP Guzzle. Headers, query strings, JSON and form bodies, file uploads, basic auth and timeouts all carry over. Tokens and passwords can become environment variables, and headers the browser adds on its own are left out. Everything is parsed in this tab; nothing is sent.",
    usesTitle: "Copy any request as cURL",
    usesNote: "Then paste it above.",
    useCases: [
      {
        tag: "Chrome · Edge",
        tint: "clay",
        title: "",
        description:
          "DevTools → Network. Right-click the request → Copy → Copy as cURL (bash).",
      },
      {
        tag: "Firefox",
        tint: "rose",
        title: "",
        description:
          "Network tab. Right-click the request → Copy Value → Copy as cURL.",
      },
      {
        tag: "Safari",
        tint: "teal",
        title: "",
        description:
          "Web Inspector → Network. Right-click the request → Copy as cURL.",
      },
      {
        tag: "Postman · Insomnia · docs",
        tint: "sage",
        title: "",
        description:
          "Open the code view and pick cURL. Most API docs show a cURL example too.",
      },
    ],
    faqs: [
      {
        question: "Is my token sent anywhere?",
        answer:
          "No. The command is parsed and the code written in this tab. With “Secrets as env variables” on, tokens and passwords don't even appear in the code you copy.",
      },
      {
        question: "What are “browser headers”?",
        answer:
          "Headers like sec-ch-ua, sec-fetch-*, user-agent and accept-language that browsers add on their own. APIs almost never need them, so leaving them out keeps your code readable.",
      },
      {
        question: "Why isn't -k in the code?",
        answer:
          "-k turns off certificate checks. It's handy for a quick local test but dangerous in code that ships, so we flag it instead of copying it.",
      },
      {
        question: "Does it handle Windows commands?",
        answer:
          "Yes — line breaks with \\ (bash), ^ (cmd) and ` (PowerShell) all work, as do single, double and $'…' quotes.",
      },
      {
        question: "Which curl options are understood?",
        answer:
          "Method, headers, -d, --data-raw, --data-binary, --data-urlencode, --json, -F forms and file uploads, -u, -b cookies, -G, -L, -k, -m and --url-query. Options with no equivalent in code, like --retry or --cacert, are read and listed as ignored, so their values are never mistaken for the URL.",
      },
    ],
    relatedSlugs: [
      "curl-generator",
      "url-parser",
      "jwt-decoder",
      "json-formatter",
    ],
  },
  "curl-generator": {
    intro:
      "Build an HTTP request in a form — method, URL, query, headers, auth, body and options — and copy a correct curl command for bash, Windows cmd or PowerShell, quoted the way each shell needs. Or import an existing command and edit it. The same request is one click away as fetch, axios, Python, Go or PHP.",
    usesTitle: "The flags you'll use most",
    usesNote: "What the generator writes, and why.",
    useCases: [
      {
        tag: "-X POST",
        tint: "clay",
        title: "",
        description:
          "Sets the method. Left out for GET, and for POST when there's a body, because curl picks those itself.",
      },
      {
        tag: "-H 'Name: value'",
        tint: "teal",
        title: "",
        description:
          "Adds a header. One -H per header; repeat it as many times as you need.",
      },
      {
        tag: "-d / -F",
        tint: "sage",
        title: "",
        description:
          "-d sends a body (JSON or form fields). -F sends multipart, and @path uploads a file.",
      },
      {
        tag: "-u · -L · -m",
        tint: "rose",
        title: "",
        description:
          "-u user:pass for basic auth, -L to follow redirects, -m 30 to give up after 30 seconds.",
      },
    ],
    faqs: [
      {
        question: "Why does PowerShell use curl.exe?",
        answer:
          "In Windows PowerShell, curl is an alias for Invoke-WebRequest, which takes different options. curl.exe runs the real curl.",
      },
      {
        question: "Why are some values in double quotes?",
        answer:
          "With “Secrets as env variables” on, tokens become $API_TOKEN (or %API_TOKEN%, $env:API_TOKEN). Shells only expand variables inside double quotes.",
      },
      {
        question: "-d or --json?",
        answer:
          "--json is shorter but needs curl 7.82 or newer. -d with a Content-Type header works everywhere, so that's what we write.",
      },
      {
        question: "Can I start from an existing command?",
        answer:
          "Yes. Use “Import a cURL command” at the top of the form, then edit any field.",
      },
      {
        question: "Is the output safe to paste into my shell?",
        answer:
          "Yes. Values are quoted for the shell you pick: single quotes in bash, curl.exe's double-quote rules in cmd, and '…' in PowerShell. Spaces, quotes and $ signs reach curl unchanged.",
      },
    ],
    relatedSlugs: ["curl-to-code", "url-encoder", "base64", "json-formatter"],
  },
  "curl-to-fetch": {
    intro:
      "Convert a curl command into fetch() that works in the browser and in Node 18+: headers, JSON and form bodies, FormData uploads, basic auth and AbortSignal timeouts, with a res.ok check so 4xx and 5xx responses don't slip through.",
    usesTitle: "Things that change in fetch",
    usesNote: "curl and the browser don't behave the same.",
    useCases: [
      {
        tag: "Cookies",
        tint: "clay",
        title: "",
        description:
          'Browsers won\'t let fetch set a Cookie header. Use credentials: "include" and let the browser send its own cookies.',
      },
      {
        tag: "CORS",
        tint: "teal",
        title: "",
        description:
          "curl ignores CORS; the browser doesn't. If the API doesn't allow your origin, call it from your server instead.",
      },
      {
        tag: "Redirects",
        tint: "sage",
        title: "",
        description:
          "fetch follows redirects by default. curl only does with -L.",
      },
      {
        tag: "Timeouts",
        tint: "rose",
        title: "",
        description:
          "curl's -m becomes signal: AbortSignal.timeout(ms). Without it, fetch waits as long as the browser does.",
      },
    ],
    faqs: [
      {
        question: "Does this work in Node?",
        answer:
          "Yes. fetch is built into Node 18 and newer, with the same code.",
      },
      {
        question: "Why is there no Content-Type for file uploads?",
        answer:
          "With FormData the browser sets it for you, including the boundary. Setting it yourself breaks the upload.",
      },
      {
        question: "Why doesn't fetch throw on a 404?",
        answer:
          "fetch only rejects on network errors. The code checks res.ok and throws for 4xx and 5xx so errors don't slip through.",
      },
      {
        question: "Are large numbers in a JSON body kept?",
        answer:
          "Yes. If a number is too big for a JavaScript number, like a 20-digit ID, the body is sent as the original JSON text instead of being rebuilt, so no digits are lost.",
      },
      {
        question: "Where do tokens and cookies go?",
        answer:
          "With “Secrets as env variables” on, they're read from process.env, so they stay out of your code and out of anything you paste it into.",
      },
    ],
    relatedSlugs: [
      "curl-to-code",
      "curl-to-axios",
      "json-to-typescript",
      "url-parser",
    ],
  },
  "curl-to-axios": {
    intro:
      "Convert a curl command into an axios request: query strings become params, bodies become data, -u becomes auth and -m becomes a timeout in milliseconds. Works in Node and the browser.",
    usesTitle: "How curl maps to axios",
    usesNote: "The options you'll see in the code.",
    useCases: [
      {
        tag: "params",
        tint: "clay",
        title: "",
        description:
          "Query strings move into a params object, so values are encoded for you.",
      },
      {
        tag: "data",
        tint: "teal",
        title: "",
        description:
          "-d and --json become data. axios turns objects into JSON and sets the header.",
      },
      {
        tag: "auth",
        tint: "sage",
        title: "",
        description:
          "-u user:pass becomes auth: { username, password } — no manual Base64.",
      },
      {
        tag: "timeout",
        tint: "rose",
        title: "",
        description:
          "-m 30 becomes timeout: 30000. axios counts in milliseconds.",
      },
    ],
    faqs: [
      {
        question: "axios or fetch?",
        answer:
          "fetch needs no install. axios gives you params, timeouts and errors on 4xx/5xx out of the box. Both are fine.",
      },
      {
        question: "Does axios throw on errors?",
        answer:
          "Yes, for any status outside 2xx. Catch it and read error.response.status.",
      },
      {
        question: "File uploads in Node?",
        answer:
          "Use the built-in FormData with a Blob in Node 18+, or the form-data package on older versions.",
      },
      {
        question: "Why is there no Content-Type header for JSON?",
        answer:
          "axios sets application/json itself when data is an object, so the header is left out to keep the code short.",
      },
      {
        question: "Are large numbers in a JSON body kept?",
        answer:
          "Yes. If a number is too big for a JavaScript number, the body is sent as the original JSON text with its Content-Type header, so no digits are lost.",
      },
    ],
    relatedSlugs: [
      "curl-to-code",
      "curl-to-fetch",
      "json-to-typescript",
      "url-parser",
    ],
  },
  "curl-to-python": {
    intro:
      "Convert a curl command into Python requests code: params, headers, json= or data= bodies, files= uploads, auth= and timeout=, with raise_for_status() so errors aren't silent.",
    usesTitle: "How curl maps to requests",
    usesNote: "The arguments you'll see in the code.",
    useCases: [
      {
        tag: "json=",
        tint: "clay",
        title: "",
        description:
          "A JSON body becomes json=payload. requests sets the Content-Type header for you.",
      },
      {
        tag: "data= · files=",
        tint: "teal",
        title: "",
        description:
          "Form fields go in data=, and -F file uploads become files= with an open file.",
      },
      {
        tag: "auth= · timeout=",
        tint: "sage",
        title: "",
        description:
          "-u becomes auth=(user, password). -m 30 becomes timeout=30 — always set one.",
      },
      {
        tag: "raise_for_status()",
        tint: "rose",
        title: "",
        description:
          "Turns 4xx and 5xx responses into exceptions, the way curl's --fail does.",
      },
    ],
    faqs: [
      {
        question: "requests or httpx?",
        answer:
          "The code uses requests. httpx has almost the same API, plus async — swap the import and it mostly just works.",
      },
      {
        question: "Many calls to the same API?",
        answer:
          "Create a requests.Session() and reuse it. It keeps the connection open and shares headers.",
      },
      {
        question: "What about -k?",
        answer:
          "That's verify=False. We leave it out on purpose; only add it for a local test server.",
      },
      {
        question: "Where do tokens and passwords go?",
        answer:
          "With “Secrets as env variables” on, they're read with os.environ, so they stay out of your code.",
      },
      {
        question: "How are file uploads sent?",
        answer:
          "Each -F file=@path becomes an open file in files=, which requests streams from disk. A ;type= in the curl command is passed along as the file's content type.",
      },
    ],
    relatedSlugs: [
      "curl-to-code",
      "json-to-python",
      "curl-generator",
      "url-parser",
    ],
  },
  "curl-to-go": {
    intro:
      "Convert a curl command into Go net/http code that compiles: http.NewRequest, headers, url.Values forms, mime/multipart uploads, SetBasicAuth and a client timeout, with every error checked.",
    usesTitle: "How curl maps to net/http",
    usesNote: "What the generated code does.",
    useCases: [
      {
        tag: "http.NewRequest",
        tint: "clay",
        title: "",
        description:
          "Method, URL and body go in one call; headers are set with req.Header.Set.",
      },
      {
        tag: "SetBasicAuth",
        tint: "teal",
        title: "",
        description:
          "-u user:pass becomes req.SetBasicAuth — Go handles the Base64.",
      },
      {
        tag: "multipart.Writer",
        tint: "sage",
        title: "",
        description:
          "-F uploads are built with mime/multipart, including the right Content-Type.",
      },
      {
        tag: "Client timeout",
        tint: "rose",
        title: "",
        description:
          "-m 30 becomes http.Client{Timeout: …}. The default client never times out.",
      },
    ],
    faqs: [
      {
        question: "Decode the response into a struct?",
        answer:
          "Paste a sample response into JSON → Go to get the struct, then use json.NewDecoder(resp.Body).Decode(&v).",
      },
      {
        question: "Why defer resp.Body.Close()?",
        answer:
          "Go keeps the connection open until the body is closed. Forgetting it leaks connections.",
      },
      {
        question: "Cancel a request?",
        answer:
          "Use http.NewRequestWithContext with a context that has a deadline.",
      },
      {
        question: "Does the code compile as it is?",
        answer:
          "Yes. It's a complete main package with its imports, every error is checked, and several file uploads each get their own variables.",
      },
      {
        question: "Where do tokens and passwords go?",
        answer:
          "With “Secrets as env variables” on, they're read with os.Getenv, so they stay out of your code.",
      },
    ],
    relatedSlugs: [
      "curl-to-code",
      "json-to-go",
      "curl-generator",
      "url-parser",
    ],
  },
  "curl-to-php": {
    intro:
      "Convert a curl command into PHP using Guzzle: headers, query, json, form_params and multipart options, auth and timeout, ready for Composer's autoloader.",
    usesTitle: "How curl maps to Guzzle",
    usesNote: "The request options you'll see.",
    useCases: [
      {
        tag: "'json'",
        tint: "clay",
        title: "",
        description:
          "A JSON body becomes the json option, which also sets the Content-Type header.",
      },
      {
        tag: "'form_params' · 'multipart'",
        tint: "teal",
        title: "",
        description:
          "-d form fields use form_params; -F uploads use multipart with fopen().",
      },
      {
        tag: "'auth' · 'timeout'",
        tint: "sage",
        title: "",
        description:
          "-u becomes ['user', 'pass']. -m 30 becomes 'timeout' => 30.",
      },
      {
        tag: "Install",
        tint: "rose",
        title: "",
        description:
          "composer require guzzlehttp/guzzle — the code expects Composer's autoloader.",
      },
    ],
    faqs: [
      {
        question: "Why Guzzle and not curl_init?",
        answer:
          "Guzzle reads much more clearly and handles JSON, forms and errors for you. The PHP curl extension works too, with more code.",
      },
      {
        question: "Does Guzzle throw on 4xx/5xx?",
        answer:
          "Yes, by default. Set 'http_errors' => false to read the status yourself.",
      },
      {
        question: "Laravel?",
        answer: "Laravel's Http facade wraps Guzzle — the same options apply.",
      },
      {
        question: "Where do tokens and passwords go?",
        answer:
          "With “Secrets as env variables” on, they're read with getenv(), so they stay out of your code.",
      },
      {
        question: "Are large numbers in a JSON body kept?",
        answer:
          "Yes. If a number wouldn't survive PHP's float, the body is sent as the original JSON text with 'body' instead of 'json', so no digits are lost.",
      },
    ],
    relatedSlugs: [
      "curl-to-code",
      "curl-generator",
      "json-formatter",
      "url-parser",
    ],
  },
};
