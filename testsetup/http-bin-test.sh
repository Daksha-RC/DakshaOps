#!/usr/bin/env bash

HOST="http://httpbin.127.0.0.1.nip.io"

# Basic request methods
curl -s "$HOST/get"
curl -s -X POST "$HOST/post" -d '{"foo":"bar"}' -H "Content-Type: application/json"
curl -s -X PUT "$HOST/put" -d 'hello'
curl -s -X DELETE "$HOST/delete"

# Status codes
curl -s "$HOST/status/200"
curl -s "$HOST/status/404"
curl -s "$HOST/status/418"

# Anything endpoint
curl -s "$HOST/anything"
curl -s "$HOST/anything/test"

# Headers
curl -s "$HOST/headers"
curl -s -H "X-Test-Header: Testing" "$HOST/headers"

# Response headers
curl -s "$HOST/response-headers?freeform=hello&another=world"

# Redirects
curl -Ls "$HOST/redirect/2"
curl -Ls "$HOST/redirect-to?url=https://example.com"

# Delay
curl -s "$HOST/delay/1"

# IP and user-agent
curl -s "$HOST/ip"
curl -s "$HOST/user-agent"

# Gzip/deflate
curl -s "$HOST/gzip"
curl -s "$HOST/deflate"

# Cookies
curl -s "$HOST/cookies"
curl -s "$HOST/cookies/set?cookie1=mycookie&cookie2=anothercookie"

# UUID
curl -s "$HOST/uuid"

# Base64
curl -s "$HOST/base64/SFRUUEJJTiBpcyBhd2Vzb21l"

# Anything else you want (stream, image, etc.)
curl -s "$HOST/stream/3"
curl -s "$HOST/html"
curl -s "$HOST/xml"
curl -s "$HOST/json"

echo "Completed hitting httpbin endpoints."