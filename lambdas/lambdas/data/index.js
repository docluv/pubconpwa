//fetch & store data files in S3

const awsUtils = require( "../libs/aws-utils" ),
    _utils = require( "../libs/utils" );


exports.getItem = function ( options ) {

    return getItems( options )
        .then( function ( items ) {

            if ( !items.length ) {

                return items;

            } else {

                for ( var index = 0; index < items.length; index++ ) {

                    var item = items[ index ];

                    //custom object comparison routine
                    if ( options.compare ) {

                        if ( options.compare( item ) ) {
                            return item;
                        }

                    } else {

                        if ( options.id === item.assetId ) {

                            return item;

                        }

                    }

                }

            }

        } );

};

exports.getItems = function ( options ) {

    return getFile( {
            "Bucket": "pubcon.love2dev.com",
            "key": options.key
        } )
        .then( response => {

            return JSON.parse( body );

        } );
};