window.ShopifyAnalytics = window.ShopifyAnalytics || {};
window.ShopifyAnalytics.meta = window.ShopifyAnalytics.meta || {};
window.ShopifyAnalytics.meta.currency = 'USD';
var meta = { page: {} };
for (var attr in meta) {
    window.ShopifyAnalytics.meta[attr] = meta[attr];
}

(function () {
    var customDocumentWrite = function (content) {
        var jquery = null;

        if (window.jQuery) {
            jquery = window.jQuery;
        } else if (window.Checkout && window.Checkout.$) {
            jquery = window.Checkout.$;
        }

        if (jquery) {
            jquery('body').append(content);
        }
    };

    var hasLoggedConversion = function (token) {
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

    var trekkie =
        (window.ShopifyAnalytics.lib =
            window.trekkie =
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
        trekkie.config = config || {};
        trekkie.config.initialDocumentCookie = document.cookie;
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
                        shop_id: 60485566618,
                        theme_id: 129053294746,
                        app_name: 'storefront',
                        context_url: window.location.href,
                        source_url:
                            'https://cdn.shopify.com/s/trekkie.storefront.14a2a604dac04b548cd8c6bdfd85448fc1df7da9.min.js'
                    }
                );
            };
            scriptFallback.async = true;
            scriptFallback.src =
                'https://cdn.shopify.com/s/trekkie.storefront.14a2a604dac04b548cd8c6bdfd85448fc1df7da9.min.js';
            first.parentNode.insertBefore(scriptFallback, first);
        };
        script.async = true;
        script.src =
            'https://cdn.shopify.com/s/trekkie.storefront.14a2a604dac04b548cd8c6bdfd85448fc1df7da9.min.js';
        first.parentNode.insertBefore(script, first);
    };
    trekkie.load({
        Trekkie: {
            appName: 'storefront',
            development: false,
            defaultAttributes: {
                shopId: 60485566618,
                isMerchantRequest: null,
                themeId: 129053294746,
                themeCityHash: '17368087556595680705',
                contentLanguage: 'en',
                currency: 'USD'
            },
            isServerSideCookieWritingEnabled: true
        },
        'Session Attribution': {},
        S2S: {
            emitV4CheckoutEvent: true,
            facebookCapiEnabled: false,
            source: 'trekkie-storefront-renderer'
        }
    });

    var loaded = false;
    trekkie.ready(function () {
        if (loaded) return;
        loaded = true;

        window.ShopifyAnalytics.lib = window.trekkie;

        var originalDocumentWrite = document.write;
        document.write = customDocumentWrite;
        try {
            window.ShopifyAnalytics.merchantGoogleAnalytics.call(this);
        } catch (error) { }
        document.write = originalDocumentWrite;

        window.ShopifyAnalytics.lib.page(null, {});

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
        'https://cdn.shopify.com/shopifycloud/shopify/assets/shop_events_listener-fa61fd11817b231631d2fe43dc869d0b1d14a06332792d42f1a1d94bda5aa31e.js';
    document.getElementsByTagName('head')[0].appendChild(eventsListenerScript);
})();

// BOOMR
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
    window.BOOMR.themeName = 'Taste';
    window.BOOMR.themeVersion = '2.0.0';
    window.BOOMR.shopId = 60485566618;
    window.BOOMR.themeId = 129053294746;
    window.BOOMR.url =
        'https://cdn.shopify.com/shopifycloud/boomerang/shopify-boomerang-1.0.0.min.js';
    var where =
        document.currentScript || document.getElementsByTagName('script')[0];
    var parentNode = where.parentNode;
    var promoted = false;
    var LOADER_TIMEOUT = 3000;
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
        window.BOOMR_onload = (e && e.timeStamp) || new Date().getTime();
    }
    if (window.addEventListener) {
        window.addEventListener('load', boomerangSaveLoadTime, false);
    } else if (window.attachEvent) {
        window.attachEvent('onload', boomerangSaveLoadTime);
    }
    if (document.addEventListener) {
        document.addEventListener('onBoomerangLoaded', function (e) {
            e.detail.BOOMR.init({
                producer_url: 'https://monorail-edge.shopifysvc.com/v1/produce',
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
