const lambda = require( "../index" );


lambda.renderSite( null, null, function ( err, success ) {

    if ( err ) {
        console.error( "crap! ", err );
    } else {
        console.log( "success: ", success );
    }

} );