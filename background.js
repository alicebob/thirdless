var strippedSendHeaders = {
    "User-Agent": true,
    "Referer": true,
    "Cookie": true,
    // These leak too much info:
    "Accept": true,
    "Accept-Language": true,
};

var strippedReceivedHeaders = {
    "Set-Cookie": true,
    // More?
};

var staticWhitelist = {
    // maps.google
    "mts0.google.com": true,
    "mts1.google.com": true,
};



// This gets updated while you browse. Keys are [tabid, hostname].
var dynamicWhitelist = {};

function getHostname(url) {
    if (match = url.match(/^https?:\/\/([^\/]+)\//)) {
        return match[1];
    }
}

function onBeforeHeadersSend(details) {
    // console.log("onBeforeHeadersSend", details.url, details.type, details.tabId);
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
        if (! ([details.tabId, hostname] in dynamicWhitelist)) {
            console.log("Accepting due to main_frame: " + hostname + ", tab " + details.tabId);
        }
        dynamicWhitelist[[details.tabId, hostname]] = true;
        return;
    }
    if ([details.tabId, hostname] in dynamicWhitelist) {
        // Known host. Allow all headers.
        // console.log("Allow as-is", details.url);
        return;
    }

    // 3rd party request. Strip some headers.
    var changed = false;
    for (var i = 0; i < details.requestHeaders.length; ) {
        if (details.requestHeaders[i].name in strippedSendHeaders) {
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
    var to, host;

    host = getHostname(details.url);
    if (! host) {
        // Weird.
        return;
    }
    if (host in staticWhitelist) {
        return;
    }

    if (host in dynamicWhitelist) {
        // Known host. Allow all headers.
        // console.log("Allow received as-is", details.url);
        return;
    }

    // 3rd party request. Strip some headers.
    var changed = false;
    for (var i = 0; i < details.responseHeaders.length; ) {
        if (details.responseHeaders[i].name in strippedReceivedHeaders) {
            // console.log("Stripping received header ", details.responseHeaders[i], details.url);
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
