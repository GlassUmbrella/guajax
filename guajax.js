// The MIT License (MIT)

// Copyright (c) 2015 Glass Umbrella

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

(function(global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) : global.guajax = factory();
}(this, function() {
    function guajax() {
        var exports = this,
            requests = [],
            counter = 0;

        exports.getWithAbortPrevious = function(url, data, identifier) {
            return exports.ajax({
                type: "GET",
                url: url,
                data: data,
                isSingle: true,
                identifier: identifier
            });
        };

        exports.get = function(url, data, options) {
            var defaultOptions = {
                type: "GET",
                url: url,
                data: data,
                allowFail: false
            };
            return exports.ajax($.extend({}, defaultOptions, options));
        };

        exports.put = function(url, data, options) {
            var defaultOptions = {
                type: "PUT",
                url: url,
                data: data,
                allowFail: false
            };
            return exports.ajax($.extend({}, defaultOptions, options));
        };

        exports.patch = function(url, data, options) {
            var defaultOptions = {
                type: "PATCH",
                url: url,
                data: data,
                allowFail: false
            };
            return exports.ajax($.extend({}, defaultOptions, options));
        };

        exports.del = function(url, data, options) {
            var defaultOptions = {
                type: "DELETE",
                url: url,
                allowFail: false
            };
            if (data) {
                defaultOptions.data = data;
            }
            return exports.ajax($.extend({}, defaultOptions, options));
        };

        exports.post = function(url, data, options) {
            var defaultOptions = {
                type: "POST",
                url: url,
                data: data,
                allowFail: false
            };
            return exports.ajax($.extend({}, defaultOptions, options));
        };

        exports.postFile = function(url, data, options) {
            var defaultOptions = {
                type: "POST",
                url: url,
                data: data,
                allowFail: false
            };
            return exports.xhr($.extend({}, defaultOptions, options));
        };

        exports.xhr = function(options) {
            var deferred = Q.defer();

            var request = new guajaxRequest(deferred, options);

            runXhrRequest(request);

            return deferred.promise;
        };

        exports.ajax = function(options) {
            var deferred = Q.defer();

            var request = new guajaxRequest(deferred, options);

            if (request.isSingle) {
                var identifier = request.identifier || options.url;
                abortAndRemovePreviousRequest(identifier);
            }

            requests.push(request);
            runRequest(request);

            return deferred.promise;
        };

        exports.hasUnauthorizedRequest = function() {
            for (var i = 0; i < requests.length; i++) {
                if (requests[i].jqueryAjax.status == 401) {
                    return true;
                }
            }
            return false;
        };

        exports.resubmitUnauthorizedRequests = function() {
            for (var i = 0; i < requests.length; i++) {
                if (requests[i].jqueryAjax.status == 401) {
                    runRequest(requests[i]);
                }
            }
        };

        function guajaxRequest(deferred, options) {
            return {
                id: getNextRequestId(),
                deferred: deferred,
                options: options,
                isSingle: options.isSingle || false,
                identifier: options.identifier || options.url,
                allowFail: options.allowFail || false
            };
        }

        function findIndexOf(callback) {
            for (var i = 0; i < requests.length; i++) {
                if (callback(requests[i]))
                    return i;
            }

            return -1;
        }

        function abortAndRemovePreviousRequest(identifier) {
            var index = findIndexOf(function(request) {
                return (request.identifier === identifier);
            });

            if (index > -1) {
                requests[index].jqueryAjax.aborted = true;
                requests[index].jqueryAjax.abort();
                requests.splice(index, 1);
            }
        }

        function getNextRequestId() {
            return "request_" + (++counter);
        }

        function removeRequestById(id) {
            var index = findIndexOf(function(request) {
                return (request.id === id);
            });

            requests.splice(index, 1);
        }

        function runRequest(request) {
            request.jqueryAjax = $.ajax(request.options)
            .done(function(response) {
                request.deferred.resolve(response);
                removeRequestById(request.id);
            })
            .fail(function(jqXHR) {
                // 401s are queued up and retried when call resubmitUnauthorizedRequests
                if (jqXHR.status !== 401) {
                    request.deferred.reject(jqXHR.responseJSON);
                    removeRequestById(request.id);
                }
            });
        }

        function runXhrRequest(request) {
            var xhrRequest = new XMLHttpRequest();
            var formData = new FormData();

            xhrRequest.open(request.options.type, request.options.url);

            xhrRequest.onload = function() {
                var response = JSON.parse(xhrRequest.response);

                if (xhrRequest.status == 200) {
                    request.deferred.resolve(response);
                } else {
                    request.deferred.reject(response);
                }
            };

            for (var key in request.options.data) {
                formData.append(key, request.options.data[key]);
            }

            xhrRequest.send(formData);
        }
    }

    return new guajax();
}));