( function () {

    "use strict";

    var self = pubcon.component,
        UPDATE_DATA = "update-data",
        //initialize Schedule as an array so the search will work in case it is empty ;)
        filteredSessions = [],
        sessionCardTemplate = "",
        sessions = [];

    function initialize() {

        //        initSearch();

        initAppBar();

        if ( "serviceWorker" in navigator ) {

            var registration;

            navigator.serviceWorker.getRegistration( "/" )
                .then( function ( sw_reg ) {

                    registration = sw_reg;

                    if ( ( !registration || !registration.active ) ||
                        registration.active.scriptURL.indexOf( "app/" ) === -1 ) {

                        navigator.serviceWorker
                            .register( "sw.js" )
                            .then( function ( sw_reg ) { // Registration was successful

                                registration = sw_reg;

                                console.log( "ServiceWorker registration successful with scope: ", registration.scope );
                            } ).catch( function ( err ) { // registration failed :(

                                console.log( "ServiceWorker registration failed: ", err );
                            } );

                    }

                } );

            navigator.serviceWorker.onmessage = function ( evt ) {

                var message = JSON.parse( evt.data ),
                    isRefresh = message.type === "refresh",
                    isAsset = message.url.includes( "asset" ),
                    lastETag = localStorage.currentETag,
                    isNew = lastETag !== message.eTag;

                if ( isRefresh && isAsset && isNew ) {

                    if ( lastETag ) {

                        notice.hidden = false;

                    }

                    //this needs to be idb
                    localStorage.currentETag = message.eTag;

                }

            };

        }

        pubcon.sw_message.sendMessage( {
            event: UPDATE_DATA
        } );

        addToHomescreen( {
            appID: "com.love2dev.pubcon",
            appName: "Pubcon.love2dev",
            lifespan: 15,
            autostart: true,
            skipFirstVisit: false,
            minSessions: 0,
            displayPace: 0,
            customPrompt: {
                title: "Install PubCon?",
                src: "meta/favicon-96x96.png",
                cancelMsg: "Cancel",
                installMsg: "Install"
            }
        } );

    }

    function initAppBar() {

        if ( self.qs( ".appbar-bottom" ) ) {

            self.on( ".appbar-bottom li", "click", function ( e ) {

                e.preventDefault();

                var target = e.currentTarget.getAttribute( "appbar-target" );

                location.href = target;

                return false;
            } );

        }

    }


    function send_message_to_sw( msg ) {

        if ( navigator.serviceWorker.controller ) {
            navigator.serviceWorker.controller.postMessage( msg );
        }
    }


    /* search */
    function initSearch() {

        var searchBox = self.qs( ".search-query" );

        searchBox.addEventListener( "keyup", function ( evt ) {

            evt.preventDefault();

            if ( searchBox.value.length > 3 || evt.keyCode === 13 ) {

                pubcon.sessions.searchSessions( searchBox.value )
                    .then( renderSearchResults );
            }

            return false;

        } );

    }

    function renderSearchResults( results ) {

        var target = self.qs( ".page-content" );

        target.innerHTML = Mustache.render( sessionCardTemplate, {
            sessions: results
        } );

    }

    /* session card template */

    function loadSessionCardTemplate() {

        return fetch( "templates/session-list.html" )
            .then( function ( response ) {

                if ( response.ok ) {

                    return response.text()
                        .then( function ( template ) {

                            sessionCardTemplate = template;

                            return;
                        } );

                }

                return;

            } );

    }


    function toggleOfflineState( state ) {
        console.log( "offline state: ", state );
    }

    window.addEventListener( "online", updateOnlineStatus );
    window.addEventListener( "offline", updateOnlineStatus );

    function updateOnlineStatus( evt ) {

        pubcon.sw_message.sendMessage( {
            event: OFFLINE_MSG_KEY,
            state: navigator.onLine
        } );

        toggleOfflineState( navigator.onLine );

    }

    initialize();

} )();