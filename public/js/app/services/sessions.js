( function () {

    "use strict";

    pubcon.utils.nameSpace( "pubcon.sessions" );

    var apiURL = "session";

    var SESSION_KEY = "-sessions",
        SESSION_STALE_KEY = SESSION_KEY + "-expires",
        USER_PROFILE = "-user-profile",
        MAX_LIST_CACHE = 15;

    function getSession( options ) {

        if ( !options && ( !options.id ) ) {

            return Promise.reject( "no valid session selection criteria supplied" );

        }

        return pubcon.data.getItem( {
            id: options.id
        }, apiURL, SESSION_KEY );

    }

    function getSessions( options ) {

        return pubcon.data
            .getItems( options, pubcon.apiURLBase + apiURL, SESSION_KEY );

    }

    function searchSessions( term ) {

        return getSessions()
            .then( function ( sessions ) {

                term = term.toLowerCase();

                return sessions.filter( function ( session ) {

                    /*
                    - speakers
                    - time
                    - date
                    */

                    return ( session.title
                        .toLowerCase().indexOf( term ) > -1 );

                } );

            } );

    }


    pubcon.sessions = {

        getSession: getSession,

        getSessions: getSessions,

        searchSessions: searchSessions

    };

}() );