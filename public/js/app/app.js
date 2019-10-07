( function () {

    "use strict";

    var self = pubcon.component,
        UPDATEselfATA = "update-data",
        //initialize Schedule as an array so the search will work in case it is empty ;)
        filteredSessions = [],
        sessionCardTemplate = "",
        sessions = [];

    function initialize() {

        initSearch();

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
            event: UPDATEselfATA
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

    function send_message_to_sw( msg ) {

        if ( navigator.serviceWorker.controller ) {
            navigator.serviceWorker.controller.postMessage( msg );
        }
    }


    // Menu toggle
    function initMenuToggle() {

        var toggler = self.qs( ".navbar-toggler" );

        toggler.addEventListener( "click", function ( evt ) {

            toggleMenu();

        } );

    }

    function toggleMenu() {
        /* Choose 992 because that is the break point where BS hides the menu toggle button */
        if ( document.body.clientWidth < 992 ) {

            document.body.classList.toggle( "menu-toggle" );

        }

    }

    function initMySessions() {

        var btnMySessions = self.qs( ".btn-my-session" );

        btnMySessions.addEventListener( "click", function () {

            pubcon.sessions.getSavedSessions()
                .then( renderSearchResults );

        } );

    }

    function renderFullSchedule() {

        pubcon.sessions.getFacetedSessions()
            .then( renderSearchResults );

    }

    function loadSessions() {

        //attempt to load the user's schedule first, then the 'full' schedule
        pubcon.sessions.getSavedSessions()
            .then( function ( savedSessions ) {

                if ( savedSessions ) {

                    renderSearchResults( savedSessions );

                } else {

                    renderFullSchedule();

                }

            } );

    }

    /* Session Details */

    function initSessionDetails() {

        var addToScheduleCB = self.qs( ".session-actions label" ),
            id = parseInt( addToScheduleCB.getAttribute( "value" ), 10 );

        if ( addToScheduleCB ) {

            addToScheduleCB.addEventListener( "click", function ( e ) {

                e.preventDefault();

                toggleSessiontoSchedule( e.target );

            } );

        }

        pubcon.sessions.getSavedSessions()
            .then( function ( sessions ) {

                sessions = sessions.filter( function ( session ) {

                    return session.id === id;

                } );

                if ( sessions && sessions.length > 0 ) {

                    var cb = self.qs( "[name='cb" + id + "']" );
                    cb.checked = true;
                }

            } );

        bindMySessions();

    }

    function toggleSessiontoSchedule( target ) {

        var cbFor = target.getAttribute( "for" ),
            value = target.getAttribute( "value" ),
            cb = self.qs( "[name='" + cbFor + "']" );

        if ( cb ) {

            if ( cb.checked ) {

                cb.checked = false;
                //push to session time filter
                pubcon.sessions.removeSession( value );

            } else {

                cb.checked = true;
                //pop from session time filter
                pubcon.sessions.saveSession( value );

            }

        }

    }

    function bindMySessions() {

        var mySessionsBtn = self.qs( ".btn-my-sessions" );

        mySessionsBtn.addEventListener( "click", function ( e ) {

            e.preventDefault();

            renderMySessions();

            return false;

        } );

    }

    function renderMySessions() {

        return pubcon.sessions.getSavedSessions()
            .then( renderSearchResults );

    }

    /*faceted search */

    function initFacetedSearch() {

        var csBigChecks = self.qsa( ".navigation-panel .big-check" );

        for ( var index = 0; index < csBigChecks.length; index++ ) {

            initFacetedFilter( csBigChecks[ index ] );

        }

        pubcon.sessions.getSelectedTimes()
            .then( function ( times ) {

                times.forEach( function ( sessionTime ) {

                    var sessionCB = self.qs( "[name=cb" + sessionTime.replace( ":", "" ) + "]" );

                    sessionCB.checked = true;

                } );

            } );

    }

    function initFacetedFilter( cbLabel ) {

        cbLabel.addEventListener( "click", function ( e ) {

            e.preventDefault();

            var cbFor = e.target.getAttribute( "for" ),
                value = e.target.getAttribute( "value" ),
                cb = self.qs( "[name='" + cbFor + "']" );

            if ( cb ) {

                if ( cb.checked ) {

                    cb.checked = false;
                    //push to session time filter
                    pubcon.sessions.removeSessionTime( value )
                        .then( renderFullSchedule );

                } else {

                    cb.checked = true;
                    //pop from session time filter
                    pubcon.sessions.addSessionTime( value )
                        .then( renderFullSchedule );

                }

            }

        } );

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