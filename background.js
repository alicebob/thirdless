var strippedSendHeaders = {
    "User-Agent": true,
    "Referer": true,
    "Cookie": true,
    // 'Accept' and 'Accept-Language' as well?
};
var strippedReceivedHeaders = {
    "Set-Cookie": true,
    // More?
};

var goodHosts = {};

function onNavigate(details) {
    // console.log("onNavigate", details.url);
    var match;
    // frameId 0 are top level. This still leaves popups with commercials,
    // though.
    if (details.frameId != 0) return;
    if (match = details.url.match(/^https?:\/\/([^\/]+)\//)) {
        console.log("Accepting ", match[1]);
        goodHosts[match[1]] = true;
    }
}

function onBeforeHeadersSend(details) {
    // console.log("sending", details.url, details.requestHeaders);
    var requestHost = '';
    var match = details.url.match(/^https?:\/\/([^\/]+)\//);
    if (! match) {
        // Weird.
        console.log("No host in ", details.url);
        return;
    }
    requestHost = match[1];
    if (requestHost in goodHosts) {
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
    // console.log("receiving", details.url, details.responseHeaders);

    var host = '';
    var match = details.url.match(/^https?:\/\/([^\/]+)\//);
    if (! match) {
        // Weird.
        // console.log("No host in ", details.url);
        return;
    }
    host = match[1];
    if (host in goodHosts) {
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
    // TODO: I'm not sure this stuff is picked up :(
    // console.log("New headers", details.responseHeaders);
    return {responseHeaders: details.responseHeaders};
}

// TODO: maybe via onHistoryStateUpdated?
chrome.webNavigation.onBeforeNavigate.addListener(onNavigate);
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
