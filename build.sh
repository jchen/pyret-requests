#!/bin/bash
wasm-pack build --target nodejs --release
wasm-opt -O3 -o pkg/pyret_requests_bg.wasm pkg/pyret_requests_bg.wasm
pyret example.arr