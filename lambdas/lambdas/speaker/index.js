const data = require( "../data" );



const apiKey = "api/speakers.json",

    speakerTimesKey = "speaker-times",
    savesSpeakers = "save-speakers",

    SPEAKER_KEY = "-speakers",
    SPEAKER_STALE_KEY = SPEAKER_KEY + "-expires",
    MAX_LIST_CACHE = 15,

    campSchedule = [],
    selectedTimes = [
        "08:30", "10:00", "11:30", "12:00", "13:30", "15:00"
    ];

exports.getSpeaker = function ( options ) {

    if ( !options && ( !options.id ) ) {

        return Promise.reject( "no valid speaker selection criteria supplied" );

    }

    return data.getItem( {
        id: options.id,
        key: apiKey
    } );

};

exports.getSpeakers = function () {

    return data.getItems( {
        item_key: SPEAKER_KEY,
        key: apiKey
    } );

};