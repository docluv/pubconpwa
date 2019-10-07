const fs = require( "fs" ),
    path = require( "path" ),
    utils = require( "./utils" ),
    utf8 = "utf-8",
    utf16 = "utf16";


let schedule = utils.readFile( "sessions-pubcon90.txt" );

schedule = schedule.split( '\r\n' );

var sessions = [],
    speakers = [],
    info = [],
    _times = [],
    _speakerFields = [ 15, 16, 17, 18, 19 ],
    times = {
        "0": {
            "start": "10:10",
            "end": "11:00"
        },
        "1": {
            "start": "10:10",
            "end": "11:00"
        },
        "2": {
            "start": "10:10",
            "end": "11:00"
        },
        "3": {
            "start": "10:10",
            "end": "11:00"
        },
        "4": {
            "start": "10:10",
            "end": "11:00"
        },
        "5": {
            "start": "10:10",
            "end": "11:00"
        },
        "6": {
            "start": "10:10",
            "end": "11:00"
        },
        "7": {
            "start": "10:10",
            "end": "11:00"
        },
        "8": {
            "start": "10:10",
            "end": "11:00"
        },
        "9": {
            "start": "10:10",
            "end": "11:00"
        },
        "10": {
            "start": "10:10",
            "end": "11:00"
        },
        "11": {
            "start": "10:10",
            "end": "11:00"
        },
        "12": {
            "start": "10:10",
            "end": "11:00"
        },
        "13": {
            "start": "10:10",
            "end": "11:00"
        },
        "14": {
            "start": "10:10",
            "end": "11:00"
        },
        "15": {
            "start": "10:10",
            "end": "11:00"
        },
        "16": {
            "start": "10:10",
            "end": "11:00"
        },
        "17": {
            "start": "10:10",
            "end": "11:00"
        },
        "18": {
            "start": "10:10",
            "end": "11:00"
        },
        "19": {
            "start": "10:10",
            "end": "11:00"
        },
        "20": {
            "start": "10:10",
            "end": "11:00"
        },
        "21": {
            "start": "10:10",
            "end": "11:00"
        },
        "22": {
            "start": "10:30",
            "end": "11:30"
        },
        "23": {
            "start": "10:10",
            "end": "11:00"
        },
        "24": {
            "start": "10:10",
            "end": "11:00"
        },
        "25": {
            "start": "10:10",
            "end": "11:00"
        },
        "26": {
            "start": "10:10",
            "end": "11:00"
        },
        "27": {
            "start": "10:10",
            "end": "11:00"
        },
        "28": {
            "start": "10:30",
            "end": "11:30"
        },
        "29": {
            "start": "10:10",
            "end": "11:00"
        },
        "30": {
            "start": "10:10",
            "end": "11:00"
        },
        "31": {
            "start": "10:10",
            "end": "11:00"
        },
        "32": {
            "start": "10:10",
            "end": "11:00"
        },
        "33": {
            "start": "10:10",
            "end": "11:00"
        },
        "34": {
            "start": "10:10",
            "end": "11:00"
        },
        "35": {
            "start": "11:10",
            "end": "12:10"
        },
        "36": {
            "start": "11:40",
            "end": "12:45"
        },
        "37": {
            "start": "11:40",
            "end": "12:35"
        },
        "38": {
            "start": "13:00",
            "end": "14:00"
        },
        "39": {
            "start": "10:10",
            "end": "11:00"
        },
        "40": {
            "start": "10:10",
            "end": "11:00"
        },
        "41": {
            "start": "10:10",
            "end": "11:00"
        },
        "42": {
            "start": "10:10",
            "end": "11:00"
        },
        "43": {
            "start": "10:10",
            "end": "11:00"
        },
        "44": {
            "start": "10:10",
            "end": "11:00"
        },
        "45": {
            "start": "11:10",
            "end": "12:10"
        },
        "46": {
            "start": "11:40",
            "end": "12:45"
        },
        "47": {
            "start": "10:10",
            "end": "11:00"
        },
        "48": {
            "start": "13:00",
            "end": "14:00"
        },
        "49": {
            "start": "10:10",
            "end": "11:00"
        },
        "50": {
            "start": "15:00",
            "end": "16:00"
        },
        "51": {
            "start": "10:10",
            "end": "11:00"
        },
        "52": {
            "start": "14:10",
            "end": "15:15"
        },
        "53": {
            "start": "10:10",
            "end": "11:00"
        },
        "54": {
            "start": "10:10",
            "end": "11:00"
        },
        "55": {
            "start": "11:10",
            "end": "12:10"
        },
        "56": {
            "start": "11:40",
            "end": "12:45"
        },
        "57": {
            "start": "15:10",
            "end": "16:00"
        },
        "58": {
            "start": "13:00",
            "end": "14:00"
        },
        "59": {
            "start": "10:10",
            "end": "11:00"
        },
        "60": {
            "start": "10:10",
            "end": "11:00"
        },
        "61": {
            "start": "10:10",
            "end": "11:00"
        },
        "62": {
            "start": "10:10",
            "end": "11:00"
        },
        "63": {
            "start": "10:10",
            "end": "11:00"
        },
        "64": {
            "start": "10:10",
            "end": "11:00"
        },
        "65": {
            "start": "11:10",
            "end": "12:10"
        },
        "66": {
            "start": "16:05",
            "end": "17:00"
        },
        "67": {
            "start": "15:10",
            "end": "16:00"
        },
        "68": {
            "start": "13:00",
            "end": "14:00"
        },
        "76": {
            "start": "15:25",
            "end": "16:30"
        }
    };

function calcTime( sessionDate, strTime ) {

    let t = times[ strTime ];

    return {
        "start": new Date( "10/" +
            sessionDate + "/2019 " +
            t.start + " AM PST " ),
        "end": new Date( "10/" +
            sessionDate + "/2019 " +
            t.end + " AM PST " ),
        "startStr": t.start,
        "endStr": t.end
    };

}

function parseSessions() {

    schedule.forEach( (
        session,
        index,
        self ) => {

        session = session.split( '\t' );

        if ( !session[ 7 ] ) {
            session[ 7 ] = "";
        }

        if ( !session[ 8 ] ) {
            session[ 8 ] = "";
        }

        let session_speakers = session.slice( 14, 19 );

        try {

            if ( session[ 1 ] !== undefined &&
                session.length > 20 &&
                (
                    session[ 0 ] !== "Session ID" &&
                    session[ 2 ] !== "0" &&
                    session[ 11 ] === "default" &&
                    session[ 6 ] !== "Continental Breakfast" &&
                    session[ 10 ] !== "" &&
                    session[ 7 ].indexOf( "Keynote" ) === -1 &&
                    session[ 8 ].indexOf( "Track" ) === -1 ) ) {

                let assetId = utils.randomId();

                let _session = {
                    "assetId": assetId,
                    "title": session[ 6 ],
                    "location": session[ 8 ],
                    "moderator": session[ 10 ],
                    "date": "10/" + session[ 3 ] + "/2019",
                    "time": calcTime( session[ 3 ], session[ 2 ] ), //convert later
                    "type": session[ 11 ],
                    "room": session[ 8 ],
                    "description": session[ 13 ]
                        .replace( /<p>|<\/p>|<li>|<\/li>|<br>/, "" )
                        .replace( '\"', "" ).replace( '"', "" )
                        .replace( "	", "" ).replace( '    ', " " )
                        .replace( "  ", " " )
                        .replace( "  ", " " )
                        .replace( "  ", " " )
                        .replace( "  ", " " ).trim(),
                    "speakers": getSessionSpeakers( session, assetId )
                };

                if ( session[ 46 ] !== "" ) {

                    _session.img = session[ 46 ].replace( "https://www.pubcon.com/images/", "img/" );

                }

                sessions.push( _session );

                _times.push( parseInt( session[ 2 ], 10 ) );

            }

        } catch ( error ) {
            console.log( error );
        }

    } );

    utils.createFile( "sessions.json",
        JSON.stringify( sessions ),
        true );

    utils.createFile( "times.json",
        JSON.stringify( _times.filter( onlyUnique ).sort() ),
        true );


}

function getSessionSpeakers( session, assetId ) {

    let _speakers = speakers.filter( value => {

        return ( value.name === session[ 15 ] ||
            value.name === session[ 16 ] ||
            value.name === session[ 17 ] ||
            value.name === session[ 18 ] ||
            value.name === session[ 19 ] );

    } );

    let _session_speakers = [];

    _speakers.forEach( speaker => {

        _session_speakers.push( {
            assetId: speaker.assetId,
            name: speaker.name,
            mugshot: speaker.mugshot.replace( "https://www.pubcon.com/images/", "img/" )
        } );

        let speakerIndex = speakers.findIndex( s => {
            return s.name === speaker.name;
        } );

        speakers[ speakerIndex ].sessions.push( {
            assetId: assetId,
            title: session[ 6 ]
        } );

    } );

    return _session_speakers;

}

function parseSpeakers() {

    schedule.forEach( (
        session,
        index,
        self ) => {

        session = session.split( '\t' );

        if ( !session[ 7 ] ) {
            session[ 7 ] = "";
        }

        if ( !session[ 8 ] ) {
            session[ 8 ] = "";
        }

        try {

            if ( session[ 1 ] !== undefined && session.length > 20 &&
                (
                    session[ 0 ] !== "Session ID" &&
                    session[ 2 ] !== "0" &&
                    session[ 11 ] === "default" &&
                    session[ 6 ] !== "Continental Breakfast" &&
                    session[ 10 ] !== "" &&
                    session[ 7 ].indexOf( "Keynote" ) === -1 &&
                    session[ 8 ].indexOf( "Track" ) === -1 ) ) {

                for ( let index = 0; index < _speakerFields.length; index++ ) {

                    if ( session[ _speakerFields[ index ] ] && session[ _speakerFields[ index ] ] !== "" ) {

                        let speaker = {
                            "assetId": utils.randomId(),
                            "name": session[ _speakerFields[ index ] ],
                            "mugshot": session[ 46 ] || "",
                            "email": "",
                            "url": "",
                            "social": {
                                "twitter": "",
                                "facebook": "",
                                "linkedin": "",
                                "youtube": ""
                            },
                            "display_mugshot": true,
                            "bio": "",
                            "sessions": []
                        };

                        speaker.avatar_letters = getInitials( speaker.name );

                        speaker.display_mugshot = speaker.mugshot !== "";;

                        speakers.push( speaker );

                    }
                }

            }

        } catch ( error ) {
            console.log( error );
        }

    } );

    speakers = onlyUniqueSpeaker( speakers );
    speakers = speakers.sort( ( a, b ) => {

        a = a.name.toLowerCase();
        b = b.name.toLowerCase();

        if ( a < b ) {
            return -1;
        }
        if ( a > b ) {
            return 1;
        }
        return 0;

    } );

}

function getInitials( str ) {
    return str.replace( " - ", " " ).split( " " ).map( ( n ) => n[ 0 ] ).join( "" ).substring( 0, 2 ).toUpperCase();
}

function onlyUnique( value, index, self ) {
    return self.indexOf( value ) === index;
}

function onlyUniqueSpeaker( data ) {

    let resArr = [];

    data.forEach( function ( item ) {

        let i = resArr.findIndex( x => x.name == item.name );

        if ( i <= -1 ) {
            resArr.push( item );

        }
    } );

    return resArr;

}

function getSpeakersSessions( speaker ) {

    let _sessions = sessions.filter( session => {

        return session.speakers.filter( s => {

            return s.name === speaker.name;

        } );

    } );

    console.log( _sessions.length );

    let _session_speakers = [];

    _sessions.forEach( session => {

        _session_speakers.push( {
            assetId: session.assetId,
            title: session.title
        } );

    } );

    return _session_speakers;

}

parseSpeakers();
parseSessions();

// for ( let index = 0; index < speakers.length; index++ ) {

//     speakers[ index ].sessions = getSpeakersSessions( speakers[ index ] );

// }

console.log( speakers[ 1 ].sessions );

utils.createFile( "speakers.json",
    JSON.stringify( speakers ), true );