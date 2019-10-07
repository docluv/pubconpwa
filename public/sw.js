importScripts( "js/libs/localforage.min.js",
    "js/libs/mustache.min.js" );




const version = "0.01",
    preCache = "PRECACHE-" + version,
    cacheList = [ "/",
        "speakers/",
        "speaker/",
        "sessions/",
        "session/",
        "profile/",
        "about/",
        "img/pubcon-logo-1200x334.png", "img/pubcon-logo-992x276.png", "img/pubcon-logo-768x214.png", "img/pubcon-logo-576x160.png", "img/pubcon-logo-460x128.png", "img/pubcon-logo-320x89.png",
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
    SESSION_KEY = "sessions",
    SPEAKER_KEY = "speakers",
    FAVORITES_KEY = "favorites",
    STALE_KEY = "-expires",
    UPDATE_DATA = "update-data",
    UPDATE_FAVORITES = "update-favorites",
    MAX_LIST_CACHE = 120;

class ResponseManager {

    //cache items in IDB to keep data as close as possible to the glass
    getLocalItems( ITEM_KEY, STALE_KEY ) {

        var dt = new Date();

        return localforage.getItem( STALE_KEY )
            .then( function ( expires ) {

                if ( expires >= dt ) {

                    return localforage.getItem( ITEM_KEY );

                } else {

                    return localforage.removeItem( ITEM_KEY )
                        .then( function () {
                            return localforage.removeItem( STALE_KEY );
                        } );

                }

            } );

    }

    setLocalItems( items, ITEM_KEY, STALE_KEY, expires ) {

        if ( !expires ) {

            expires = new Date();

            expires.setMinutes( expires.getMinutes() + this.MAX_LIST_CACHE );

        } else {

            var dt = new Date();

            dt.setMinutes( dt.getMinutes() + expires );

            expires = dt;
        }

        return localforage.setItem( ITEM_KEY, items )
            .then( function () {

                return localforage
                    .setItem( ITEM_KEY + STALE_KEY, expires );

            } )
            .then( function () {
                return items;
            } );

    }

    isResponseCacheable( response ) {

        //only cache good responses
        //200 - Good :)
        // 0  - Good, but CORS. 
        //This is for Cross Origin opaque requests

        return [ 0, 200 ].includes( response.status );

    }

    isResponseNotFound( response ) {


        return response.status === 404;

    }

    fetchText( url ) {

        return fetch( url )
            .then( response => {

                if ( response.ok ) {

                    return response.text();

                }

            } );

    }

    fetchJSON( url ) {

        return fetch( url )
            .then( response => {

                if ( response.ok ) {

                    return response.json();

                }

            } );

    }

    fetchAndRenderResponseCache( options ) {

        let _self = this;

        return _self.fetchText( options.pageURL )
            .then( pageHTML => {

                return _self.fetchText( options.template )
                    .then( template => {

                        return pageHTML.replace( /<%template%>/g, template );

                    } );

            } )
            .then( pageTemplate => {

                return options.api( options.request )
                    .then( data => {

                        return Mustache.render( pageTemplate, data );

                    } );

            } ).then( html => {

                //make custom response
                let response = new Response( html, {
                        headers: {
                            'content-type': 'text/html'
                        }
                    } ),
                    copy = response.clone();

                caches.open( options.cacheName )
                    .then( cache => {
                        cache.put( options.request, copy );
                    } );

                return response;

            } );

    }

    cacheFallingBackToNetwork( request, cacheName ) {

        var responseManager = this;

        return caches.match( request )
            .then( response => {

                return response || fetch( request );

            } );
    }

    cacheFallingBackToNetworkCache( request, cacheName ) {

        var responseManager = this;

        return caches.match( request )
            .then( response => {

                if ( response ) {

                    return response;

                } else {

                    return fetch( request )
                        .then( response => {

                            //don't cache a 404 because the URL may become 200, etc
                            //chrome-extension requests can't be cached
                            //0 & 200 are good responses that can be cached
                            if ( !responseManager.isResponseNotFound( response ) &&
                                request.method.toUpperCase() === "GET" &&
                                request.url.indexOf( "chrome-extension" ) === -1 &&
                                responseManager.isResponseCacheable( response ) ) {

                                let rsp = response.clone();

                                //cache response for the next time around
                                return caches.open( cacheName ).then( function ( cache ) {

                                    cache.put( request, rsp );

                                    return response;

                                } );

                            } else {

                                return response;

                            }

                        } );

                }

            } );

    }

    cacheOnly( request, cacheName ) {

        return caches.match( request );

    }

    networkOnly( request ) {

        return fetch( request );

    }

    /*
        @param: url 
        @param: key
        @param: expires
        @param: forceUpdate
        @param: fetchOptions

    */
    cacheIDBFallingBackToNetworkCacheIDB( options ) {

        return this.getLocalItems( options.item_key, options.stale_key )
            .then( results => {

                if ( results ) {
                    return results;
                }

                return fetch( options.url, options.fetchOptions )
                    .then( response => {

                        if ( response.ok ) {

                            return response.json()
                                .then( data => {

                                    return this.setLocalItems( data, options.item_key,
                                        options.stale_key, options.expires );

                                } );

                        } else {

                            return response.json();

                        }

                    } );


            } );

    }

}

class PushManager {

    constructor() {

        this.registerPush();

    }

    registerPush() {

        var pm = this;

        self.addEventListener( "push", event => {
            pm.handlePush( event );
        } );

        pm.registerResponse();

    }

    handlePush( event ) {

        console.log( '[Service Worker] Push Received.' );
        // console.log( '[Service Worker] Data: ', event.data );
        // console.log( `[Service Worker] Push had this data: "${event.data.text()}"` );

        try {

            const data = event.data.text(),
                msg = JSON.parse( data );

            event.waitUntil( self.registration
                .showNotification( msg.message.title, msg.message ) );

        } catch ( e ) {
            console.log( 'invalid json - notification supressed' );
        }

    }

    registerResponse() {

        var that = this;

        self.addEventListener( 'notificationclick', event => {

            that.handleResponse( event );

        } );

    }

    handleResponse( event ) {

        console.log( '[Service Worker] Notification click Received. ${event}' );

        if ( event.action && this.validURL( event.action ) ) {

            clients.openWindow( event.action );

        }

        event.notification.close();

    }

    validURL( str ) {

        try {
            let url = new URL( str );

            return true;

        } catch ( error ) {
            return false;
        }

    }

}

class InvalidationManager {

    constructor( invalidationRules ) {

        this.invalidationRules = invalidationRules;
        this.lastCleanUpTime = 0;

        this.cacheCleanUp();
    }

    cacheCleanUp() {

        let dt = Date.now();

        if ( this.lastCleanUpTime < ( dt - 1800000 ) ) {

            let invMgr = this;

            invMgr.invalidationRules.forEach( ( value ) => {

                switch ( value.invalidationStrategy ) {

                    case "ttl":

                        invMgr.updateStaleEntries( value );

                        break;

                    case "maxItems":

                        invMgr.maxItems( value );

                        break;

                    default:
                        break;
                }

            } );

            this.lastCleanUpTime = dt;

        }

    }

    maxItems( options ) {

        self.caches.open( options.cacheName ).then( ( cache ) => {

            cache.keys().then( ( keys ) => {

                if ( keys.length > options.strategyOptions.max ) {

                    let purge = keys.length - options.strategyOptions.max;

                    for ( let i = 0; i < purge; i++ ) {
                        cache.delete( keys[ i ] );
                    }

                }

            } );

        } );

    }

    updateStaleEntries( rule ) {

        self.caches.open( rule.cacheName )
            .then( ( cache ) => {

                cache.keys().then( function ( keys ) {

                    keys.forEach( ( request, index, array ) => {

                        cache.match( request ).then( ( response ) => {

                            let date = new Date( response.headers.get( "date" ) ),
                                current = Date.now();

                            //300 === 5 minutes
                            //3600 === 1 Hour
                            //86400 === 1 day
                            //604800 === 1 week

                            if ( !DateManager.compareDates( current, DateManager.addSecondsToDate( date, 300 ) ) ) {

                                cache.add( request );

                            }

                        } );

                    } );

                } );

            } );

    }

    invalidateCache( cacheName ) {

        let invMgr = this;

        invMgr.invalidationRules.forEach( ( value ) => {

            if ( value.cacheName === cacheName ) {

                switch ( value.invalidationStrategy ) {

                    case "ttl":

                        invMgr.updateStaleEntries( value );

                        break;

                    case "maxItems":

                        invMgr.maxItems( value );

                        break;

                    default:
                        break;
                }

            }

        } );

    }

}

class DateManager {

    constructor() {}

    static ensureDateType( value ) {

        //maybe switch to switch statement????

        if ( !value ) {
            return new Date();
        }

        if ( Object.prototype.toString.call( value ) === "[object Date]" ) {
            return value;
        }

        //convert to date
        if ( typeof value === "object" ) {
            return new Date( value );
        }

        if ( typeof value === "string" ) {
            value = parseInt( value );
        }

        //assume the number is the number of seconds to live before becoming stale
        if ( typeof value === "number" ) {
            return new Date( Date.now() + value );
        }

        return value;

    }

    static compareDates( date1, date2 ) {

        date1 = this.ensureDateType( date1 );
        date2 = this.ensureDateType( date2 );

        return ( date1 < date2 );

    }

    static addSecondsToDate( t, seconds ) {

        return t.setSeconds( t.getSeconds() + seconds );

    }

}

self.addEventListener( "install", function ( event ) {

    console.log( "Installing the service worker!" );

    self.skipWaiting();

    event.waitUntil(

        caches.open( preCache )
        .then( cache => {

            cacheList.forEach( url => {

                fetch( url )
                    .then( function ( response ) {
                        if ( !response.ok ) {
                            throw new TypeError( 'bad response status - ' + response.url );
                        }
                        return cache.put( url, response );
                    } )
                    .catch( err => {
                        console.error( err );
                    } );

            } );

        } )

    );

} );

self.addEventListener( "activate", function ( event ) {

    event.waitUntil(

        //wholesale purge of previous version caches
        caches.keys().then( cacheNames => {
            cacheNames.forEach( value => {

                if ( value.indexOf( version ) < 0 ) {
                    caches.delete( value );
                }

            } );

            console.log( "service worker activated" );

            return;

        } )
        .then( () => {

            return getTemplates();

        } )
        .then( () => {

            return updateCachedData();

        } )
        .then( () => {

            return renderSite();
        } )

    );

} );

self.addEventListener( "fetch", function ( event ) {

    event.respondWith(

        caches.match( event.request )
        .then( function ( response ) {

            if ( response ) {
                return response;
            }

            return fetch( event.request )
                .then( response => {

                    if ( response && response.ok ) {

                        return caches.open( "pubcon" )
                            .then( cache => {
                                return cache.put( event.request, response.clone() );
                            } )
                            .then( () => {
                                return response;
                            } );


                    } else {

                        //offline fallback
                    }

                } );
        } )


    );

} );

self.addEventListener( "message", event => {

    switch ( event.data.event ) {

        case UPDATE_DATA:

            updateCachedData();
            break;

        case OFFLINE_MSG_KEY:

            toggleOffline( event.data.state );

            break;

        case UPDATE_FAVORITES:

            updatefavorites();

            break;
        default:

            console.log( event );

            break;
    }

} );


/*
    - fetch sessions and speakers when sw installed
    - trigger update for each page load
    - set time expiration at 60 minutes
    - render all session and speaker pages

*/


function renderSite() {

    let speakers = [],
        sessions = [];

    localforage.getItem( SESSION_KEY )
        .then( results => {

            sessions = results;

            return localforage.getItem( SPEAKER_KEY );
        } )
        .then( res => {

            speakers = res;

            let pages = [];

            sessions.forEach( session => {

                pages.push( renderPage( "session/" +
                    session.assetId + "/", "session", session ) );

            } );

            speakers.forEach( speaker => {

                pages.push( renderPage( "speaker/" +
                    speaker.assetId + "/", "speaker", speaker ) );

            } );

            pages.push( renderPage( "speakers/", "speakers", {
                speakers: speakers
            } ) );

            //render home page
            pages.push( renderPage( location.origin, "sessions", {
                sessions: sessions
            } ) );

            return Promise.all( pages );

        } )
        .then( results => {

            console.log( "site updated" );

        } )
        .catch( err => {

            console.error( err );

        } );

}

let templates = {};

/*
        "templates/shell.html",
        "templates/speaker-list.html",
        "templates/speaker.html",

*/

function getTemplates() {

    return getHTMLAsset( "templates/session-list.html" )
        .then( html => {
            templates.sessions = html;
        } )
        .then( () => {

            return getHTMLAsset( "templates/session.html" )
                .then( html => {
                    templates.session = html;
                } );

        } )
        .then( () => {

            return getHTMLAsset( "templates/shell.html" )
                .then( html => {
                    templates.shell = html;
                } );

        } )
        .then( () => {

            return getHTMLAsset( "templates/speaker-list.html" )
                .then( html => {
                    templates.speakers = html;
                } );

        } )
        .then( () => {

            return getHTMLAsset( "templates/speaker.html" )
                .then( html => {
                    templates.speaker = html;
                } );

        } );

}

function renderPage( slug, templateName, data ) {

    let pageTemplate = templates[ templateName ];

    let template = templates.shell.replace( "<%template%>", pageTemplate );

    pageHTML = Mustache.render( template, data );

    let response = new Response( pageHTML, {
        headers: {
            "content-type": "text/html",
            "date": new Date().toLocaleString()
        }
    } );

    return caches.open( "pubcon" )
        .then( cache => {
            cache.put( slug, response );
        } );

}

function updateCachedData() {

    return fetch( "api/sessions.json" )
        .then( response => {

            if ( response && response.ok ) {

                return response.json();

            } else {
                throw {
                    status: response.status,
                    message: "failed to fetch session data"
                };
            }

        } )
        .then( sessions => {

            return localforage.setItem( SESSION_KEY, sessions );

        } )
        .then( () => {

            var dt = new Date();

            dt.setMinutes( dt.getMinutes() + MAX_LIST_CACHE );

            return localforage
                .setItem( SESSION_KEY + STALE_KEY, dt );

        } )
        .then( () => {

            return fetch( "api/speakers.json" )
        } )
        .then( response => {

            if ( response && response.ok ) {

                return response.json();

            } else {
                throw {
                    status: response.status,
                    message: "failed to fetch session data"
                };
            }

        } )
        .then( speakers => {

            return localforage.setItem( SPEAKER_KEY, speakers );

        } )
        .then( () => {

            var dt = new Date();

            dt.setMinutes( dt.getMinutes() + MAX_LIST_CACHE );

            return localforage
                .setItem( SPEAKER_KEY + STALE_KEY, dt );

        } );

}

function updatefavorites() {}

function send_message_to_client( client, msg ) {
    return new Promise( function ( resolve, reject ) {
        var msg_chan = new MessageChannel();

        msg_chan.port1.onmessage = function ( event ) {
            if ( event.data.error ) {
                reject( event.data.error );
            } else {
                resolve( event.data );
            }
        };

        client.postMessage( msg, [ msg_chan.port2 ] );
    } );
}

function getHTMLAsset( slug ) {

    return caches.match( slug )
        .then( response => {

            if ( response ) {

                return response.text();

            }

        } );

}