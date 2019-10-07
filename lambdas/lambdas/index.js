const page = require( "./page" ),
    session = require( "./sessions" ),
    speaker = require( "./speaker" );


exports.renderSite = function ( event, context, callback ) {

    let speakers = [],
        sessions = [];

    session.getSessions()
        .then( results => {

            sessions = results;

            return speaker.getSpeakers();
        } )
        .then( results => {

            speakers = results;

            let pages = [];

            sessions.forEach( session => {

                pages.push( page.renderPage( "session/" +
                    session.assetId, "session", session ) );

            } );

            speakers.forEach( speaker => {

                pages.push( page.renderPage( "speaker/" +
                    speaker.assetId, "speaker", speaker ) );

            } );

            pages.push( page.renderPage( "speakers/", "speakers", speakers ) );
            //render home page
            pages.push( page.renderPage( "", "sessions", sessions ) );

            return Promise.all( pages );

        } )
        .then( results => {

            callback( null, {
                status: 200,
                message: "site updated"
            } );

        } )
        .catch( err => {

            callback( err );

        } );

};


exports.renderSpeaker = function ( speakerId ) {

    speaker.getSpeaker( {
            id: speakerId
        } )
        .then( speaker => {

            page.renderPage( "speaker/" +
                speakerId, "speaker", speaker );

        } );

};

exports.renderSession = function ( sessionId ) {

    speaker.getSpeaker( {
            id: sessionId
        } )
        .then( session => {

            page.renderPage( "session/" +
                sessionId, "session", session );

        } );

};

exports.updateSpeaker = function ( speaker ) {};