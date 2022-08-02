use reqwest::{get, Client, Error, Response};
use wasm_bindgen::prelude::*;

// Use `wee_alloc` as the global allocator.
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

/**
 * A response struct that is passed through JS to Pyret.
 */
#[wasm_bindgen(js_name = RustResponse)]
#[derive(Clone)]
pub struct PyretResponse {
    body: String,
}
#[wasm_bindgen(js_class = RustResponse)]
impl PyretResponse {
    pub fn body(&self) -> String {
        self.body.clone()
    }
}
impl PyretResponse {
    pub async fn from_response(
        response: Result<Response, Error>,
    ) -> Result<PyretResponse, JsValue> {
        match response {
            Ok(response) => {
                let body = response.text().await.unwrap().clone();
                Ok(PyretResponse { body })
            }
            Err(_) => Err(JsValue::NULL),
        }
    }
}

/**
 * A client struct that is passed through JS to Pyret.
 */
#[wasm_bindgen(js_name = RustClient)]
#[derive(Clone)]
pub struct PyretClient {
    client: reqwest::Client,
}
#[wasm_bindgen(js_class = RustClient)]
impl PyretClient {
    #[wasm_bindgen(constructor)]
    pub fn new() -> PyretClient {
        PyretClient {
            client: Client::new(),
        }
    }

    pub async fn get(self, url: String) -> ClientAndResponse {
        let response = self.client.get(url).send().await;
        ClientAndResponse {
            client: self,
            response: PyretResponse::from_response(response).await,
        }
    }
}

/**
 * See above for context...
 * This is some pretty finicky code because the lifetime of PyretClient is tied to the
 * return of async PyretClient::get (which is a promise handled in JS, not in Rust).
 * This solution is to pass the client back to JS and let JS preserve the lifetime
 * of the client instead.
 */
#[wasm_bindgen]
pub struct ClientAndResponse {
    client: PyretClient,
    response: Result<PyretResponse, JsValue>,
}

#[wasm_bindgen]
impl ClientAndResponse {
    pub fn client(&self) -> PyretClient {
        self.client.clone()
    }
    pub fn response(&self) -> Result<PyretResponse, JsValue> {
        self.response.clone()
    }
}

// TODO: doesn't work right now because of Pyret module top-level issue?
#[wasm_bindgen(js_name = get)]
pub async fn pyret_get(url: String) -> Result<PyretResponse, JsValue> {
    let response = get(&url).await;
    PyretResponse::from_response(response).await
}

/**
 * Here for testing and sanity check that the relevant moving parts are
 * interfacing correctly.
 */
#[wasm_bindgen]
pub fn hello() -> String {
    "hello".into()
}
