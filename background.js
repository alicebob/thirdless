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

var goodHosts = {
    // maps.google
    "mts0.google.com": true,
    "mts1.google.com": true,
};

function getHostname(url) {
    if (match = url.match(/^https?:\/\/([^\/]+)\//)) {
        return match[1];
    }
}

/*
function onNavigate(details) {
    console.log("onNavigate", details.url, details.type);
    var match;
    // frameId 0 are top level. This still leaves popups with commercials,
    // though.
    if (details.frameId != 0) return;
    var hostname;
    if (hostname = getHostname(details.url)) {
        console.log("Accepting ", hostname);
        goodHosts[hostname] = true;
    }
}
*/

function onBeforeHeadersSend(details) {
    // console.log("onBeforeHeadersSend", details.url, details.type);
    // console.log("sending", details.url, details.requestHeaders);
    var requestHost = '';
    var hostname = getHostname(details.url);
    if (! hostname) {
        // Weird.
        console.log("No host in ", details.url);
        return;
    }

    if (details.type === "main_frame") {
        // Requests is top level. We accept this host from now on.
        console.log("Accepting due to main_frame: ", hostname);
        goodHosts[hostname] = true;
        return;
    }
    if (hostname in goodHosts) {
        // Known host. Allow all headers.
        // console.log("Allow as-is", details.url);
        return;
    }
    // 3rd party request. Strip some headers.
    var changed = false;
    console.log("Stripping headers to ", details.url);
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
    // console.log("receiving", details.url, details.responseHeaders);
    var to, host;

    host = getHostname(details.url);
    if (! host) {
        // Weird.
        // console.log("No host in ", details.url);
        return;
    }
    if (host in goodHosts) {
        // Known host. Allow all headers.
        // console.log("Allow received as-is", details.url);
        /*
        for (var i = 0; i < details.responseHeaders.length; i++) {
            if (details.responseHeaders[i].name === "Location") {
                if (to = getHostname(details.responseHeaders[i].value)) {
                    console.log("Is a redirect to ", to);
                    goodHosts[to] = true;
                }
                break;
            }
        }
        */
        return;
    }
    // 3rd party request. Strip some headers.
    console.log("Stripping received headers from ", details.url);
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

// chrome.webNavigation.onHistoryStateUpdated.addListener(function(details) {console.log("onHistoryStateUpdated", details.url);});
// chrome.webNavigation.onBeforeNavigate.addListener(onNavigate);
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
