import js-file("requests") as Requests

check "Rust-WASM-JS-Pyret interfacing?": 
  Requests.hello() is some("hello")
end

check "Get":
  client = Requests.client()
  client.get("/") satisfies is-none
  client.get("https://google.com/") satisfies is-some

  maybe-resp = client.get("https://httpbin.org/get")
  body = cases (Option) maybe-resp:
   | some(resp) => resp.body
   | none => raise("Did not expect no response!")
  end
  body satisfies string-contains(_, "\"Host\": \"httpbin.org\"")
end
