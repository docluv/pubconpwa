importScripts("js/libs/localforage.min.js",
    "js/libs/mustache.min.js");


const version = "0.02",
    preCache = "PRECACHE-" + version,
    cacheList = ["/",
        "speakers/",
        "sessions/",
        "profile/",
        "about/",
        "img/pubcon-logo-1200x334.png", "img/pubcon-logo-992x276.png", "img/pubcon-logo-768x214.png", "img/pubcon-logo-576x160.png", "img/pubcon-logo-460x128.png", "img/pubcon-logo-320x89.png",
        "font/pubcon.woff2?4247060",
        "templates/offline.html",
        "templates/session-list.html",
        "templates/session.html",
        "templates/shell.html",
        "templates/speaker-list.html",
        "templates/speaker.html",
        "css/bootstrap.min.css",
        "css/addtohomescreen.css",
        "css/site.css",
        "css/mdb.min.css",
        "js/libs/addtohomescreen.min.js",
        "js/libs/localforage.min.js",
        "js/libs/mustache.min.js",
        "js/app/services/utils.js",
        "js/app/services/data.js",
        "js/app/services/sessions.js",
        "js/app/services/speakers.js",
        "js/app/services/favorites.js",
        "js/app/ui/component.base.js",
        "js/app/ui/favorites.js",
        "js/libs/share.js",
        "js/app/services/sw_message.js",
        "js/app/app.js",
        "js/app/controllers/search.js"
    ],
    OFFLINE_MSG_KEY = "toggle-online",
    SESSION_KEY = "sessions",
    SPEAKER_KEY = "speakers",
    FAVORITES_KEY = "user_favorites",
    STALE_KEY = "-expires",
    UPDATE_DATA = "update-data",
    UPDATE_FAVORITES = "update-favorites",
    MAX_LIST_CACHE = 120;

self.addEventListener("install", async function (event) {

    console.log("Installing the service worker!");

    self.skipWaiting();

    event.waitUntil(

        caches.open(preCache).then(async function (cache) {

            for (const url of cacheList) {

                try {

                    const response = await fetch(url);

                    if (!response.ok) {
                        throw new TypeError("bad response status - " + response.url);
                    }

                    await cache.put(url, response);

                } catch (error) {

                    console.error(error);

                }

            }

        })

    );

});


self.addEventListener("activate", async function (event) {

    event.waitUntil(async () => {
        // Purge caches for previous versions
        const cacheNames = await caches.keys();

        for (const value of cacheNames) {
            if (value.indexOf(version) < 0) {
                await caches.delete(value);
            }
        }

        console.log("Service worker activated");

        try {

            await getTemplates();
            await updateCachedData();
            await renderSite();
            await updatefavorites();

        } catch (error) {
            console.error(error);
        }

    });

});


self.addEventListener("fetch", async function (event) {
   
    event.respondWith(

        (async () => {

            const cacheResponse = await caches.match(event.request);

            if (cacheResponse) {
                return cacheResponse;
            }

            try {

                const fetchResponse = await fetch(event.request);

                if (fetchResponse && fetchResponse.ok) {

                    const cache = await caches.open("pubcon");
                    await cache.put(event.request, fetchResponse.clone());

                    return fetchResponse;

                } else {
                    // offline fallback
                    console.error("Fetch error: ", fetchResponse.status);
                }

            } catch (error) {
                console.error("Fetch error: ", error);
            }

        })()

    );

});


self.addEventListener("message", event => {

    switch (event.data.event) {

        case UPDATE_DATA:

            updateCachedData();
            break;

        case OFFLINE_MSG_KEY:

            toggleOffline(event.data.state);

            break;

        case UPDATE_FAVORITES:

            updatefavorites();

            break;
        default:

            console.log(event);

            break;
    }

});


/*
    - fetch sessions and speakers when sw installed
    - trigger update for each page load
    - set time expiration at 60 minutes
    - render all session and speaker pages

*/


async function renderSite() {

    try {

        const sessions = await localforage.getItem(SESSION_KEY);

        const speakers = await localforage.getItem(SPEAKER_KEY);

        const pages = [];

        sessions.forEach((session) => {
            pages.push(renderPage(`session/${session.assetId}/`, "session", session));
        });

        speakers.forEach((speaker) => {
            pages.push(renderPage(`speaker/${speaker.assetId}/`, "speaker", speaker));
        });

        pages.push(renderPage("speakers/", "speakers", { speakers }));

        pages.push(renderPage(location.origin, "sessions", { sessions }));

        const results = await Promise.all(pages);

        console.log("site updated");

        await updatefavorites();

    } catch (error) {
        console.error(error);
    }

}


let templates = {};

function getTemplates() {

    return getHTMLAsset("templates/session-list.html")
        .then(html => {
            templates.sessions = html;
        })
        .then(() => {

            return getHTMLAsset("templates/session.html")
                .then(html => {
                    templates.session = html;
                });

        })
        .then(() => {

            return getHTMLAsset("templates/shell.html")
                .then(html => {
                    templates.shell = html;
                });

        })
        .then(() => {

            return getHTMLAsset("templates/speaker-list.html")
                .then(html => {
                    templates.speakers = html;
                });

        })
        .then(() => {

            return getHTMLAsset("templates/speaker.html")
                .then(html => {
                    templates.speaker = html;
                });

        });

}

function renderPage(slug, templateName, data) {

    let pageTemplate = templates[templateName];

    let template = templates.shell.replace("<%template%>", pageTemplate);

    pageHTML = Mustache.render(template, data);

    let response = new Response(pageHTML, {
        headers: {
            "content-type": "text/html",
            "date": new Date().toLocaleString()
        }
    });

    return caches.open("pubcon")
        .then(cache => {
            cache.put(slug, response);
        });

}

function updateCachedData() {

    return fetch("api/sessions.json")
        .then(response => {

            if (response && response.ok) {

                return response.json();

            } else {
                throw {
                    status: response.status,
                    message: "failed to fetch session data"
                };
            }

        })
        .then(sessions => {

            return localforage.setItem(SESSION_KEY, sessions);

        })
        .then(() => {

            var dt = new Date();

            dt.setMinutes(dt.getMinutes() + MAX_LIST_CACHE);

            return localforage
                .setItem(SESSION_KEY + STALE_KEY, dt);

        })
        .then(() => {

            return fetch("api/speakers.json")
        })
        .then(response => {

            if (response && response.ok) {

                return response.json();

            } else {
                throw {
                    status: response.status,
                    message: "failed to fetch session data"
                };
            }

        })
        .then(speakers => {

            return localforage.setItem(SPEAKER_KEY, speakers);

        })
        .then(() => {

            var dt = new Date();

            dt.setMinutes(dt.getMinutes() + MAX_LIST_CACHE);

            return localforage
                .setItem(SPEAKER_KEY + STALE_KEY, dt);

        });

}

function updatefavorites() {

    return getFavorites()
        .then(favorites => {

            let actions = [];

            favorites.forEach(id => {

                actions.push(getSessionById(id));

            });

            return Promise.all(actions);

        })
        .then(sessions => {

            return renderPage("favorites/", "sessions", {
                sessions: sessions
            });

        });

}

function getFavorites() {

    return localforage.getItem(FAVORITES_KEY)
        .then(function (favorites) {

            if (!favorites) {
                favorites = [];
            }

            return favorites;

        });

}

function getSessionById(id) {

    return localforage.getItem(SESSION_KEY)
        .then(sessions => {

            return sessions.find(session => {

                return session.assetId === id;
            });

        });

}

function send_message_to_client(client, msg) {
    return new Promise(function (resolve, reject) {
        var msg_chan = new MessageChannel();

        msg_chan.port1.onmessage = function (event) {
            if (event.data.error) {
                reject(event.data.error);
            } else {
                resolve(event.data);
            }
        };

        client.postMessage(msg, [msg_chan.port2]);
    });
}

function getHTMLAsset(slug) {

    return caches.match(slug)
        .then(response => {

            if (response) {

                return response.text();

            }

        });

}