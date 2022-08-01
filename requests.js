({
    requires: [],
    nativeRequires: [
        "./pkg/pyret_requests",
        "pyret-base/js/namespace"
    ],
    provides: {
        shorthands: {},
        values: {
            "client": ["arrow", [], ["local", "Client"]],
            // TODO: doesn't work right now? 
            // "get": ["arrow", ["String"], ["Option", ["local", "Response"]]],
            "hello": ["arrow", [], ["Option", "String"]],
        },
        aliases: {
            "Client": {
                tag: "name",
                origin: { "import-type": "$ELF" },
                name: "Client"
            },
            "Response": {
                tag: "name",
                origin: { "import-type": "$ELF" },
                name: "Response"
            },
        },
        datatypes: {
            "Client": ["data", "Client", [], [], {
                "get": ["arrow", ["String"], ["Option", "String"]],
            }],
            "Response": ["data", "Response", [], [], {
                "body": "String"
            }],
        },
    },
    theModule: function (runtime, namespace, uri, req) {
        var O = runtime.makeObject;
        var F = runtime.makeFunction;
        var arity = runtime.checkArity;
        var get = runtime.getField;

        function applyBrand(brand, val) {
            return get(brand, "brand").app(val);
        }

        function hasBrand(brand, val) {
            return get(brand, "test").app(val);
        }

        const brandClient = runtime.namedBrander("client", ["client: client brander"]);
        const brandResponse = runtime.namedBrander("response", ["response: response brander"]);

        /**
         * Converts a Response from Rust into a Response object for Pyret.
         * @param {RustResponse} response 
         * @returns a barnded Response Pyret object
         */
        function makePyretResponse(response) {
            var res = O({
                body: runtime.makeString(response.body()),
            });
            return applyBrand(brandResponse, res);
        }

        /**
         * Method .get(url) of Client.
         */
        const clientGet = runtime.makeMethod1(function (self, url) {
            if (arguments.length !== 2) {
                var $a = new Array(arguments.length);
                for (var $i = 0; $i < arguments.length; $i++) {
                    $a[$i] = arguments[$i];
                }
                throw runtime.ffi.throwArityErrorC(['get'], 2, $a, true);
            }
            runtime.checkArgsInternal1("client", "get", url, runtime.String);
            return runtime.pauseStack(restarter => {
                // $rustClient gets consumed due to lifetimes of get(), so we have to reset it
                self.$rustClient.get(url)
                    .then(clientAndResponse => {
                        self.$rustClient = clientAndResponse.client();
                        var ret;
                        try {
                            const response = clientAndResponse.response();
                            ret = runtime.ffi.makeSome(makePyretResponse(response));
                        } catch (_) {
                            ret = runtime.ffi.makeNone();
                        }
                        restarter.resume(ret);
                    });
            });
        });

        /**
         * Constructor for a Pyret Client. 
         * @returns a brand-branded Client object
         */
        function makeClient() {
            var client = O({
                get: clientGet
            });
            client = applyBrand(brandClient, client);
            client.$rustClient = new req.RustClient();
            return client;
        }

        /**
         * TODO: doesn't work right now
         * Top-level, non-client get. 
         * @param {String} url 
         * @returns A Pyret Response if possible
         */
        function get(url) {
            arity(1, arguments, "get", false);
            runtime.checkArgsInternal1("requests", "get", key, runtime.String);
            return runtime.pauseStack(function (restarter) {
                var response = req.get(url);
                response.then(function (response) {
                    restarter.resume(runtime.ffi.makeSome(makePyretResponse(response)));
                }).catch(function (err) {
                    restarter.resume(runtime.ffi.makeNone());
                });
            });
        }

        const vals = {
            "client": F(makeClient, "client"),
            // TODO: doesn't work right now (see above)
            // "get": F(get, "get"),
            "hello": F(() => runtime.ffi.makeSome(runtime.makeString(req.hello())), "hello"),
        };
        var types = {};
        var internal = {};

        return runtime.makeModuleReturn(vals, types, internal);
    }
})