const awsUtils = require( "../libs/aws-utils" ),
    _utils = require( "../libs/utils" ),
    mustache = require( "mustache" ),
    Bucket = "pubcon.love2dev.com",
    templates = {
        "sessions": "templates/session-list.html",
        "session": "templates/session.html",
        "speakers": "templates/speal-list.html",
        "speaker": "templates/speaker-list.html"
    };


exports = {

    renderPage = function ( slug, templateName, data ) {

        awsUtils.getFile( {
                Bucket: Bucket,
                key: templates[ templateName ]
            } )
            .then( pageTemplate => {

                return mustache.render( pageTemplate, data );

            } )
            .then( pageHTML => {

                return aws.uploadFile( {
                        Bucket: Bucket,
                        key: slug + "index.html",
                        body: pageHTML,
                        gzip: true
                    } )
                    .then( () => {

                        return sendNotifications( page );

                    } );

            } );


    }

};