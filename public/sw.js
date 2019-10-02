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
        "css/pubcon.css",
        "css/boostrap.min.css",
        "css/animate.min.css",
        "css/addtohomescreen.css",
        "css/site.css",
        "css/mdb.min.css",
        "js/app.js",
        "js/services/data.js",
        "js/services/sessions.js",
        "js/services/speakers.js",
        "js/services/http.js",
        "js/services/utils.js",
        "js/services/sw_message.js",
        "js/controllers/sessions.js",
        "js/controllers/speakers.js",
        "js/controllers/session.js",
        "js/controllers/speaker.js",
        "js/controllers/profile.js",
        "js/libs/mustache.min.js",
        "js/libs/localforage.min.js"
    ];

class ResponseManager {

    MAX_LIST_CACHE = 15;

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

    caches.open( preCache )
        .then( cache => {

            cache.addAll( cacheList );

        } );

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

    );

} );

self.addEventListener( "fetch", function ( event ) {

    event.respondWith(

        fetch( event.request )

        /* check the cache first, then hit the network */
        /*
                caches.match( event.request )
                .then( function ( response ) {

                    if ( response ) {
                        return response;
                    }

                    return fetch( event.request );
                } )
        */
    );

} );

self.addEventListener( "message", event => {

    switch ( event.data.event ) {

        case UPDATE_DATA:

            updateCachedData();
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


function renderSessions() {}

function renderSpeakers() {}

function updateCachedData() {}



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