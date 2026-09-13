import urllib.request
import urllib.error
import json

req = urllib.request.Request('http://127.0.0.1:5000/api/applications/get-all')
try:
    with urllib.request.urlopen(req) as response:
        print(response.getcode())
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code)
