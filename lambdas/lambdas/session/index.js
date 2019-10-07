const data = require( "../data" );


const sessionTimesKey = "session-times",
    savesSessions = "save-sessions",

    SESSION_KEY = "-sessions",
    SESSION_STALE_KEY = SESSION_KEY + "-expires",
    MAX_LIST_CACHE = 15,

    campSchedule = [],
    selectedTimes = [
        "08:30", "10:00", "11:30", "12:00", "13:30", "15:00"
    ];

exports.getSession = function ( options ) {

    if ( !options && ( !options.id ) ) {

        return Promise.reject( "no valid session selection criteria supplied" );

    }

    return data.getItem( {
        id: options.id
    }, apiURL, SESSION_KEY );

};

exports.getSessions = function () {

    return data.getItems( {
        item_key: SESSION_KEY,
        url: "api/sessions.json"
    } );

};