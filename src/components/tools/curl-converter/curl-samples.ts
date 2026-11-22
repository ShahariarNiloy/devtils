/** Example commands shown as "Try" chips (from the design board). */
export type SampleKey = "json" | "chrome" | "get" | "upload" | "form";

export const SAMPLES: Record<SampleKey, { label: string; src: string }> = {
  json: {
    label: "POST JSON + token",
    src: 'curl -X POST https://api.example.com/v1/customers \\\n  -H \'Authorization: Bearer sk_test_51Hx9cAbCdEf\' \\\n  -H \'Content-Type: application/json\' \\\n  -d \'{"email":"ada@example.com","name":"Ada Lovelace","metadata":{"plan":"pro","seats":3}}\'',
  },
  chrome: {
    label: "Copied from Chrome",
    src: "curl 'https://app.example.com/api/orders?page=2&status=open' \\\n  -H 'accept: application/json, text/plain, */*' \\\n  -H 'accept-language: en-US,en;q=0.9' \\\n  -H 'cookie: session=eyJhbGciOi.abc; theme=dark' \\\n  -H 'priority: u=1, i' \\\n  -H 'referer: https://app.example.com/orders' \\\n  -H 'sec-ch-ua: \"Chromium\";v=\"131\", \"Not_A Brand\";v=\"24\"' \\\n  -H 'sec-ch-ua-mobile: ?0' \\\n  -H 'sec-ch-ua-platform: \"macOS\"' \\\n  -H 'sec-fetch-dest: empty' \\\n  -H 'sec-fetch-mode: cors' \\\n  -H 'sec-fetch-site: same-origin' \\\n  -H 'user-agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' \\\n  -H 'x-csrf-token: 9f8e7d6c5b4a' \\\n  --compressed",
  },
  get: {
    label: "GET with query",
    src: "curl -G https://api.github.com/search/repositories \\\n  --data-urlencode 'q=language:go stars:>1000' \\\n  -d per_page=5 \\\n  -H 'Accept: application/vnd.github+json'",
  },
  upload: {
    label: "File upload",
    src: "curl https://uploads.example.com/v2/files \\\n  -u ada:s3cret-pass \\\n  -F 'file=@./avatar.png;type=image/png' \\\n  -F 'alt=Profile photo' \\\n  -m 30",
  },
  form: {
    label: "Form + -k",
    src: "curl -k -X POST https://localhost:8443/oauth/token \\\n  -d grant_type=client_credentials \\\n  -d client_id=web-app \\\n  -d client_secret=Zk81Lq0pWm \\\n  -d scope='read write'",
  },
};
