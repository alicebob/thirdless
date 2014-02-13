Experimental Chrome extension.

Removes all 'identifing' headers from HTTP requests to requests other than the
site you're looking at, or have looked at in the tab. Removes cookies, user-agent, referer and some other leaky headers.

Requests to third party sites are still made, so you will still be tracked via
your IPnumber, but we make it a little harded to expose useful information,
while keeping most legit functionality in tact.

Cookies set in redirects chains to unknown sites don't get set.
If you log in on accounts.google.com for gmail it'll redirect to
accounts.youtube.com and google.de to set some cookies. Those are blocked (unless you visited one of those sites before in the same tab).

Seems to work in the sense that it doesn't seem to break too many sites.
