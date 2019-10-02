( function () {

    var self = pubcon.component,
        UPDATE_DATA = "update-data";

    function initialize() {

        self.on( ".btn-navbar-toggle", pubcon.events.click, expandNavBarMenu );
        self.on( ".navbar-toggle", pubcon.events.click, expandSidebar );

        document.body.addEventListener( pubcon.events.click, toggleOverlaysOff );

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

    function send_message_to_sw( msg ) {

        if ( navigator.serviceWorker.controller ) {
            navigator.serviceWorker.controller.postMessage( msg );
        }
    }

    function toggleOverlaysOff( e ) {

        //        e.preventDefault();

        var $html = self.qs( "html" );

        $html.classList.remove( "nav-open", "show-search-box" );

        //        return false;

    }

    function expandNavBarMenu( e ) {
        e.preventDefault();

        var rightNavbar = self.qs( ".right-navbar" );

        rightNavbar.classList.toggle( "show" );

        return false;
    }

    function expandSidebar( e ) {
        e.preventDefault();
        e.stopPropagation();

        var $html = self.qs( "html" );

        $html.classList.toggle( "nav-open" );

        return false;
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