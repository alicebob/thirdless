var strippedSendHeaders = {
    "user-agent": true,
    "referer": true,
    "cookie": true,
    // These leak too much info:
    "accept": true,
    "accept-language": true,
};

// Headers must be in lowercase
var strippedReceivedHeaders = {
    "set-cookie": true,
    // More?
};

var staticWhitelist = {
    // maps.google
    "mts0.google.com": true,
    "mts1.google.com": true,
    "khms0.google.com": true,
    "khms1.google.com": true,
    "mt0.googleapis.com": true,
    "mt1.googleapis.com": true,
};



// This gets updated while you browse. Keys are [tabid, hostname].
var dynamicWhitelist = {};

// Unknown hosts we redirect to get put on this list. When they redirect as the
// first thing they do we don't put them on the dynamic whitelist.
var cautiousList = {};

function getHostname(url) {
    if (match = url.match(/^https?:\/\/([^\/]+)\//)) {
        return match[1];
    }
}

function onBeforeHeadersSend(details) {
    // console.log("onBeforeHeadersSend", details.url);
    var requestHost = '';
    var hostname = getHostname(details.url);
    if (! hostname) {
        // Weird.
        return;
    }

    if (hostname in staticWhitelist) {
        return;
    }

    if (details.type === "main_frame") {
        // Request is top level. We accept this host from now on for this tab.
        // console.log("Accepting due to main_frame: ", hostname);
        if (hostname in cautiousList) {
            console.log("not setting whitelist due to cautiousList", hostname);
        } else {
            if (! ([details.tabId, hostname] in dynamicWhitelist)) {
                console.log("Accepting due to main_frame: " + hostname + ", tab " + details.tabId);
            }
            dynamicWhitelist[[details.tabId, hostname]] = true;
        }
        return
    }
    if ([details.tabId, hostname] in dynamicWhitelist) {
        // Known host. Allow all headers.
        // console.log("Allow as-is", details.url);
        return
    }

    // 3rd party request. Strip some headers.
    var changed = false;
    for (var i = 0; i < details.requestHeaders.length; ) {
        if (details.requestHeaders[i].name.toLowerCase() in strippedSendHeaders) {
            // console.log("Stripping send header ", details.requestHeaders[i], details.url);
            details.requestHeaders.splice(i, 1);
            changed = true;
            continue;
        }
        i++;
    }
    if (! changed) {
        return;
    }
    return {requestHeaders: details.requestHeaders};
}

function onBeforeHeadersResponse(details) {
    // console.log("onBeforeHeadersResponse", details.url);
    var to, host, stripHeaders;

    host = getHostname(details.url);
    if (! host) {
        // Weird.
        return;
    }
    if (host in staticWhitelist) {
        return;
    }

    stripHeaders = true;
    if ([details.tabId, host] in dynamicWhitelist) {
        console.log("response, host in dyn whitelist: ", host);
        stripHeaders = false;
        // Known host. Allow all headers
        // console.log("Allow received as-is", details.url);
        //
        // Check for redirects to new hosts. We don't accept those that easily.
        for (var i = 0; i < details.responseHeaders.length; i++) {
            // console.log("Check header ", details.responseHeaders[i].name);
            if (details.responseHeaders[i].name.toLowerCase() === 'location') {
                to = getHostname(details.responseHeaders[i].value);
                if (!(to in dynamicWhitelist)) {
                    console.log("Setting on cautiousList: ", to);
                    cautiousList[to] = true
                }
            }
        }
    }

    if (host in cautiousList) {
        console.log("in cautiousList: ", host);
        // This is a new host we just redirected to. If it redirects again
        // ignore it, otherwise it can go on the dynamic whitelist.
        var redirecting = false;
        for (var i = 0; i < details.responseHeaders.length; i++) {
            // console.log("Check header ", details.responseHeaders[i].name);
            if (details.responseHeaders[i].name.toLowerCase() === 'location') {
                console.log("Redirecting again!");
                redirecting = true;
                // Taint the next hop as well, if needed.
                to = getHostname(details.responseHeaders[i].value);
                if (!(to in dynamicWhitelist)) {
                    console.log("Setting on cautiousList: ", to);
                    cautiousList[to] = true
                }
                break;
            }
        }
        if (! redirecting) {
            console.log("Accepting " + host);
            delete cautiousList[host];
            dynamicWhitelist[[details.tabId, host]] = true;
            stripHeaders = false;
        }
    }
    if (! stripHeaders) {
        console.log("Accepting headers for ", host);
        return;
    }

    // 3rd party request. Strip some incoming headers.
    var changed = false;
    for (var i = 0; i < details.responseHeaders.length; ) {
        if (details.responseHeaders[i].name.toLowerCase() in strippedReceivedHeaders) {
            console.log("Stripping received header ", details.responseHeaders[i].name, details.responseHeaders[i].value, details.url);
            details.responseHeaders.splice(i, 1);
            changed = true;
            continue;
        }
        i++;
    }
    if (! changed) {
        return;
    }
    return {responseHeaders: details.responseHeaders};
}

chrome.webRequest.onBeforeSendHeaders.addListener(
    onBeforeHeadersSend,
    {
        "urls": [
            "http://*/*",
            "https://*/*"
        ]
    },
    [ "blocking", "requestHeaders" ]
);
chrome.webRequest.onHeadersReceived.addListener(
    onBeforeHeadersResponse,
    {
        "urls": [
            "http://*/*",
            "https://*/*"
        ]
    },
    [ "blocking", "responseHeaders" ]
);
