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


self.addEventListener("message", async event => {

    switch (event.data.event) {

        case UPDATE_DATA:

            await updateCachedData();
            break;

        case OFFLINE_MSG_KEY:

            toggleOffline(event.data.state);

            break;

        case UPDATE_FAVORITES:

            await updatefavorites();

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

async function getTemplates() {

    try {

        templates.sessions = await getHTMLAsset("templates/session-list.html");

        templates.session = await getHTMLAsset("templates/session.html");

        templates.shell = await getHTMLAsset("templates/shell.html");

        templates.speakers = await getHTMLAsset("templates/speaker-list.html");

        templates.speaker = await getHTMLAsset("templates/speaker.html");

    } catch (err) {
        console.error(err);
    }
}

async function renderPage(slug, templateName, data) {

    const pageTemplate = templates[templateName];
    const template = templates.shell.replace("<%template%>", pageTemplate);
    const pageHTML = Mustache.render(template, data);

    const response = new Response(pageHTML, {
        headers: {
            "content-type": "text/html",
            "date": new Date().toLocaleString()
        }
    });

    const cache = await caches.open("pubcon");
    
    await cache.put(slug, response);

}

async function updateCachedData() {

    try {

        const sessionsResponse = await fetch("api/sessions.json");

        if (sessionsResponse.ok) {
   
            const sessions = await sessionsResponse.json();
   
            await localforage.setItem(SESSION_KEY, sessions);

            const dt = new Date();
            dt.setMinutes(dt.getMinutes() + MAX_LIST_CACHE);
  
            await localforage.setItem(SESSION_KEY + STALE_KEY, dt);
   
        } else {
   
            throw {
                status: sessionsResponse.status,
                message: "failed to fetch session data"
            };
   
        }

        const speakersResponse = await fetch("api/speakers.json");

        if (speakersResponse.ok) {
  
            const speakers = await speakersResponse.json();
            await localforage.setItem(SPEAKER_KEY, speakers);

            const dt = new Date();
            dt.setMinutes(dt.getMinutes() + MAX_LIST_CACHE);
  
            await localforage.setItem(SPEAKER_KEY + STALE_KEY, dt);
  
        } else {
  
            throw {
                status: speakersResponse.status,
                message: "failed to fetch speaker data"
            };
  
        }

    } catch (error) {
        console.error(error);
    }

}

const updateFavorites = async () => {

    try {
   
        const favorites = await getFavorites();
        const sessions = await Promise.all(favorites.map(id => getSessionById(id)));
   
        await renderPage("favorites/", "sessions", { sessions });
   
    } catch (error) {
        console.error(error);
    }

}

async function getFavorites() {
    const favorites = await localforage.getItem(FAVORITES_KEY) || [];
    return favorites;
}

async function getSessionById(id) {

    try {

        const sessions = await localforage.getItem(SESSION_KEY);
        const session = sessions.find(session => session.assetId === id);

        return session;

    } catch (error) {
        console.error(error);
        throw error;
    }

}

async function sendMessageToClient(client, msg) {

    const msgChan = new MessageChannel();
    
    const messagePromise = new Promise((resolve, reject) => {
    
        msgChan.port1.onmessage = event => {
    
            if (event.data.error) {
                reject(event.data.error);
            } else {
                resolve(event.data);
            }
    
        };
    
    });
    
    client.postMessage(msg, [msgChan.port2]);
    
    return messagePromise;

}

async function getHTMLAsset(slug) {

    const response = await caches.match(slug);

    if (response) {
        return response.text();
    }

}
