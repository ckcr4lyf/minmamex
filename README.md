# minmamex

Helping minmax AMEX rewards

## Running locally

First clone the repo and install dependencies:

```
git clone https://github.com/ckcr4lyf/minmamex.git
cd minmamex
npm i
npm run build
```

### With username and password

This method is recommended since it is handles the auth and cookies

Currently in testing mode, there is a hacky way to run it locally and dump details to stdout:

```
read -sp "Enter Username: " AMEX_USER
read -sp "Enter Password: " AMEX_PASSWORD
node build/src/bin.js -u "$AMEX_USER" -p "$AMEX_PASSWORD"
```

### Via cookies

First, obtain the cookies:

1. [Log into your AMEX account in a browser](https://www.americanexpress.com/en-hk/account/login?inav=hk_utility_login).
2. Open devtools (e.g. F12 or Ctrl+Shift+I). 
3. Go back to the AMEX page, and click into the "Membership Rewards" (e.g. "Use Your Points")
4. Find the request for `/en-hk/rewards/membership-rewards/`
5. Right click, copy as cURL
6. Extract the cookie string, e.g.:

```
curl 'https://www.americanexpress.com/en-hk/rewards/membership-rewards/' \
  -H 'accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7' \
  -H 'accept-language: en-GB,en-US;q=0.9,en;q=0.8,zh-TW;q=0.7,zh;q=0.6' \
  -b $'agent-id=8525e894-5c17-4889-....[REDACTED]'\
  -H 'priority: u=0, i' \
  -H 'sec-ch-ua: "Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "Linux"' \
  -H 'sec-fetch-dest: document' \
  -H 'sec-fetch-mode: navigate' \
  -H 'sec-fetch-site: same-site' \
  -H 'sec-fetch-user: ?1' \
  -H 'upgrade-insecure-requests: 1' \
  -H 'user-agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'
```

^ in this example, `'agent-id=8525e894-5c17-4889-....[REDACTED]'` is the string

Then you can run:
```
node build/src/bin.js -c "cookie_string"
```

## Contributing

Currently not accepting contributions. Feel free to open issues though.
