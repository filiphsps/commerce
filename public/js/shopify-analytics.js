'use strict';

(function () {
    if (!window.ShopifyAnalytics) window.ShopifyAnalytics = {};
    var customDocumentWrite = function (content) { };

    var hasLoggedConversion = function (token) {
        if (
            document.cookie.indexOf(
                'loggedConversion=' + window.location.pathname
            ) !== -1
        ) {
            return true;
        }
        if (token) {
            return document.cookie.indexOf('loggedConversion=' + token) !== -1;
        }
        return false;
    };

    var setCookieIfConversion = function (token) {
        if (token) {
            var twoMonthsFromNow = new Date(Date.now());
            twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);

            document.cookie =
                'loggedConversion=' + token + '; expires=' + twoMonthsFromNow;
        }
    };

    var trekkie = (window.ShopifyAnalytics.lib = window.trekkie =
        window.trekkie || []);
    if (trekkie.integrations) {
        return;
    }
    trekkie.methods = [
        'identify',
        'page',
        'ready',
        'track',
        'trackForm',
        'trackLink'
    ];
    trekkie.factory = function (method) {
        return function () {
            var args = Array.prototype.slice.call(arguments);
            args.unshift(method);
            trekkie.push(args);
            return trekkie;
        };
    };
    for (var i = 0; i < trekkie.methods.length; i++) {
        var key = trekkie.methods[i];
        trekkie[key] = trekkie.factory(key);
    }
    trekkie.load = function (config) {
        trekkie.config = config;
        var first = document.getElementsByTagName('script')[0];
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.onerror = function (e) {
            var scriptFallback = document.createElement('script');
            scriptFallback.type = 'text/javascript';
            scriptFallback.onerror = function (error) {
                var Monorail = {
                    produce: function produce(
                        monorailDomain,
                        schemaId,
                        payload
                    ) {
                        var currentMs = new Date().getTime();
                        var event = {
                            schema_id: schemaId,
                            payload: payload,
                            metadata: {
                                event_created_at_ms: currentMs,
                                event_sent_at_ms: currentMs
                            }
                        };
                        return Monorail.sendRequest(
                            'https://' + monorailDomain + '/v1/produce',
                            JSON.stringify(event)
                        );
                    },
                    sendRequest: function sendRequest(endpointUrl, payload) {
                        // Try the sendBeacon API
                        if (
                            window &&
                            window.navigator &&
                            typeof window.navigator.sendBeacon === 'function' &&
                            typeof window.Blob === 'function' &&
                            !Monorail.isIos12()
                        ) {
                            var blobData = new window.Blob([payload], {
                                type: 'text/plain'
                            });

                            if (
                                window.navigator.sendBeacon(
                                    endpointUrl,
                                    blobData
                                )
                            ) {
                                return true;
                            } // sendBeacon was not successful
                        } // XHR beacon

                        var xhr = new XMLHttpRequest();

                        try {
                            xhr.open('POST', endpointUrl);
                            xhr.setRequestHeader('Content-Type', 'text/plain');
                            xhr.send(payload);
                        } catch (e) {
                            console.log(e);
                        }

                        return false;
                    },
                    isIos12: function isIos12() {
                        return (
                            window.navigator.userAgent.lastIndexOf(
                                'iPhone; CPU iPhone OS 12_'
                            ) !== -1 ||
                            window.navigator.userAgent.lastIndexOf(
                                'iPad; CPU OS 12_'
                            ) !== -1
                        );
                    }
                };
                Monorail.produce(
                    'monorail-edge.shopifysvc.com',
                    'trekkie_storefront_load_errors/1.1',
                    {
                        shop_id: 13525845,
                        theme_id: 11069489175,
                        app_name: 'storefront',
                        context_url: window.location.href,
                        source_url:
                            'https://cdn.shopify.com/s/trekkie.storefront.a371b3c5dcd102bda5f5ad38a5935fc3c874a1fe.min.js'
                    }
                );
            };
            scriptFallback.async = true;
            scriptFallback.src =
                'https://cdn.shopify.com/s/trekkie.storefront.a371b3c5dcd102bda5f5ad38a5935fc3c874a1fe.min.js';
            if (first && first.parentNode)
                first.parentNode.insertBefore(scriptFallback, first);
        };
        script.async = true;
        script.src =
            'https://cdn.shopify.com/s/trekkie.storefront.a371b3c5dcd102bda5f5ad38a5935fc3c874a1fe.min.js';
        first.parentNode.insertBefore(script, first);
    };

    // TODO: this should be configurable
    trekkie.load({
        Trekkie: {
            appName: 'storefront',
            development: false,
            defaultAttributes: {
                shopId: 60485566618,
                isMerchantRequest: null,
                themeId: 129053294746,
                contentLanguage: 'en',
                currency: 'USD'
            },
            isServerSideCookieWritingEnabled: true,
            isPixelGateEnabled: true
        },
        Performance: {
            navigationTimingApiMeasurementsEnabled: true,
            navigationTimingApiMeasurementsSampleRate: 1
        },
        'Google Analytics': {
            trackingId: 'UA-135777877-1',
            domain: 'auto',
            siteSpeedSampleRate: '10',
            enhancedEcommerce: true,
            doubleClick: true,
            includeSearch: true
        },
        'Facebook Pixel': {
            pixelIds: ['283944132512876'],
            agent: 'plshopify1.2'
        },
        'Session Attribution': {},
        'Customer Events API': {}
    });

    var loaded = false;
    trekkie.ready(function () {
        if (loaded) return;
        loaded = true;

        window.ShopifyAnalytics.lib = window.trekkie;

        ga('require', 'linker');
        function addListener(element, type, callback) {
            if (element.addEventListener) {
                element.addEventListener(type, callback);
            } else if (element.attachEvent) {
                element.attachEvent('on' + type, callback);
            }
        }
        function decorate(event) {
            event = event || window.event;
            var target = event.target || event.srcElement;
            if (
                target &&
                (target.getAttribute('action') || target.getAttribute('href'))
            ) {
                ga(function (tracker) {
                    var linkerParam = tracker.get('linkerParam');
                    document.cookie =
                        '_shopify_ga=' + linkerParam + '; ' + 'path=/';
                });
            }
        }
        addListener(window, 'load', function () {
            for (var i = 0; i < document.forms.length; i++) {
                var action = document.forms[i].getAttribute('action');
                if (action && action.indexOf('/cart') >= 0) {
                    addListener(document.forms[i], 'submit', decorate);
                }
            }
            for (var i = 0; i < document.links.length; i++) {
                var href = document.links[i].getAttribute('href');
                if (href && href.indexOf('/checkout') >= 0) {
                    addListener(document.links[i], 'click', decorate);
                }
            }
        });

        var originalDocumentWrite = document.write;
        document.write = customDocumentWrite;
        try {
            window.ShopifyAnalytics.merchantGoogleAnalytics.call(this);
        } catch (error) { }
        document.write = originalDocumentWrite;
        (function () {
            if (
                window.BOOMR &&
                (window.BOOMR.version || window.BOOMR.snippetExecuted)
            ) {
                return;
            }
            window.BOOMR = window.BOOMR || {};
            window.BOOMR.snippetStart = new Date().getTime();
            window.BOOMR.snippetExecuted = true;
            window.BOOMR.snippetVersion = 12;
            window.BOOMR.application = 'storefront-renderer';
            window.BOOMR.themeName = '';
            window.BOOMR.themeVersion = '';
            window.BOOMR.shopId = 13525845;
            window.BOOMR.themeId = 11069489175;
            window.BOOMR.url =
                'https://cdn.shopify.com/shopifycloud/boomerang/shopify-boomerang-1.0.0.min.js';
            var where =
                document.currentScript ||
                document.getElementsByTagName('script')[0];
            var parentNode = where.parentNode;
            var promoted = false;
            var LOADER_TIMEOUT = 3000;
            var BOOMR_lstart;
            function promote() {
                if (promoted) {
                    return;
                }
                var script = document.createElement('script');
                script.id = 'boomr-scr-as';
                script.src = window.BOOMR.url;
                script.async = true;
                parentNode.appendChild(script);
                promoted = true;
            }
            function iframeLoader(wasFallback) {
                promoted = true;
                var dom, bootstrap, iframe, iframeStyle;
                var doc = document;
                var win = window;
                window.BOOMR.snippetMethod = wasFallback ? 'if' : 'i';
                bootstrap = function (parent, scriptId) {
                    var script = doc.createElement('script');
                    script.id = scriptId || 'boomr-if-as';
                    script.src = window.BOOMR.url;
                    BOOMR_lstart = new Date().getTime();
                    parent = parent || doc.body;
                    parent.appendChild(script);
                };
                if (
                    !window.addEventListener &&
                    window.attachEvent &&
                    navigator.userAgent.match(/MSIE [67]./)
                ) {
                    window.BOOMR.snippetMethod = 's';
                    bootstrap(parentNode, 'boomr-async');
                    return;
                }
                iframe = document.createElement('IFRAME');
                iframe.src = 'about:blank';
                iframe.title = '';
                iframe.role = 'presentation';
                iframe.loading = 'eager';
                iframeStyle = (iframe.frameElement || iframe).style;
                iframeStyle.width = 0;
                iframeStyle.height = 0;
                iframeStyle.border = 0;
                iframeStyle.display = 'none';
                parentNode.appendChild(iframe);
                try {
                    win = iframe.contentWindow;
                    doc = win.document.open();
                } catch (e) {
                    dom = document.domain;
                    iframe.src =
                        "javascript:var d=document.open();d.domain='" +
                        dom +
                        "';void(0);";
                    win = iframe.contentWindow;
                    doc = win.document.open();
                }
                if (dom) {
                    doc._boomrl = function () {
                        this.domain = dom;
                        bootstrap();
                    };
                    doc.write("<body onload='document._boomrl();'>");
                } else {
                    win._boomrl = function () {
                        bootstrap();
                    };
                    if (win.addEventListener) {
                        win.addEventListener('load', win._boomrl, false);
                    } else if (win.attachEvent) {
                        win.attachEvent('onload', win._boomrl);
                    }
                }
                doc.close();
            }
            var link = document.createElement('link');
            if (
                link.relList &&
                typeof link.relList.supports === 'function' &&
                link.relList.supports('preload') &&
                'as' in link
            ) {
                window.BOOMR.snippetMethod = 'p';
                link.href = window.BOOMR.url;
                link.rel = 'preload';
                link.as = 'script';
                link.addEventListener('load', promote);
                link.addEventListener('error', function () {
                    iframeLoader(true);
                });
                setTimeout(function () {
                    if (!promoted) {
                        iframeLoader(true);
                    }
                }, LOADER_TIMEOUT);
                BOOMR_lstart = new Date().getTime();
                parentNode.appendChild(link);
            } else {
                iframeLoader(false);
            }
            function boomerangSaveLoadTime(e) {
                window.BOOMR_onload =
                    (e && e.timeStamp) || new Date().getTime();
            }
            if (window.addEventListener) {
                window.addEventListener('load', boomerangSaveLoadTime, false);
            } else if (window.attachEvent) {
                window.attachEvent('onload', boomerangSaveLoadTime);
            }
            if (document.addEventListener) {
                document.addEventListener('onBoomerangLoaded', function (e) {
                    e.detail.BOOMR.init({
                        producer_url:
                            'https://monorail-edge.shopifysvc.com/v1/produce',
                        ResourceTiming: {
                            enabled: true,
                            trackedResourceTypes: ['script', 'img', 'css']
                        }
                    });
                    e.detail.BOOMR.t_end = new Date().getTime();
                });
            } else if (document.attachEvent) {
                document.attachEvent('onpropertychange', function (e) {
                    if (!e) e = event;
                    if (e.propertyName === 'onBoomerangLoaded') {
                        e.detail.BOOMR.init({
                            producer_url:
                                'https://monorail-edge.shopifysvc.com/v1/produce',
                            ResourceTiming: {
                                enabled: true,
                                trackedResourceTypes: ['script', 'img', 'css']
                            }
                        });
                        e.detail.BOOMR.t_end = new Date().getTime();
                    }
                });
            }
        })();

        window.ShopifyAnalytics.lib.page(null, { pageType: 'home' });

        var match = window.location.pathname.match(
            /checkouts\/(.+)\/(thank_you|post_purchase)/
        );
        var token = match ? match[1] : undefined;
        if (!hasLoggedConversion(token)) {
            setCookieIfConversion(token);
        }
    });

    var eventsListenerScript = document.createElement('script');
    eventsListenerScript.async = true;
    eventsListenerScript.src =
        '//cdn.shopify.com/shopifycloud/shopify/assets/shop_events_listener-68ba3f1321f00bf07cb78a03841621079812265e950cdccade3463749ea2705e.js';
    document.getElementsByTagName('head')[0].appendChild(eventsListenerScript);
})();
