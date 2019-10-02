/*
This is a common data service module that handles
common repeated logic patterns used by all the 
distinct object types.
Ultimately we want to perform these operations in the
service worker and trigger the actions either via
a URL request or a messaging routine
*/

( function () {

    "use strict";

    pubcon.utils.nameSpace( "pubcon.data" );

    var _tennantId;

    var _STALE_KEY = "-expires",
        MAX_LIST_CACHE = 15;

    //actually get individual item from local cache rather than from cloud DB
    //this routine should keep the local cache fresh while reducing network traffic
    //and database load
    //even for a large operation with lots of parts this should not be a 
    //big data burder as we can easily cache several MB of parts and order histories
    //plus technicians will be the primary candidate for offline issues and
    //they really just need the parts and their own orders to access.
    function getItem( options, apiURL, ITEM_KEY ) {

        //perform specific object validation before this level
        //at a minimum the criteria should include an id since all single
        //items will require an assetId to filter the result and the assetId
        //is a unique UUID value
        if ( !options && ( !options.id ) ) {

            return Promise.reject( "no valid item selection criteria supplied" );

        }

        //most likely coming from IDB
        return getItems( options, apiURL, ITEM_KEY )
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

    }

    function getItems( options, apiURL, ITEM_KEY ) {

        return getLocalItems( options, ITEM_KEY )
            .then( function ( items ) {

                if ( ( items && items.length > 0 ) && !options.forceUpdate ) {
                    return items;
                } else {

                    //the apiURL should be completed before this layer
                    //should include all queryString parameters to drive the 
                    //API request
                    return pubcon.http.authorized( {
                            "method": "GET",
                            "mode": "cors",
                            "url": apiURL
                        } )
                        .then( function ( response ) {

                            if ( response.ok ) {

                                return response.json();

                            }

                            throw response.status;

                        } )
                        .then( function ( items ) {

                            if ( items.length && items.length > 0 ) {

                                return saveLocalItems( items, options.tennantId, ITEM_KEY );

                            } else {

                                return Promise.resolve( items );

                            }

                        } );

                }

            } );

    }

    function updateItem( options, apiURL, ITEM_KEY ) {

        if ( !options.body ) {
            return Promise.reject( "no item object supplied" );
        }

        _tennantId = options.tennantId;

        options.body.date_updated = new Date().toISOString();

        return pubcon.http.authorized( {
                "method": "POST",
                "mode": "cors",
                "url": apiURL,
                "body": JSON.stringify( options.body )
            } )
            .then( function ( response ) {

                if ( response.ok ) {

                    return response.json();

                }

                //could postMessage to service worker to update cached list here
            } )
            .then( function ( resp ) {

                return getItems( {
                    "forceUpdate": true,
                    "tennantId": _tennantId
                }, apiURL, ITEM_KEY );

            } )
            .then( function () {
                return options.body;
            } );

    }

    function deleteItem( options, apiURL, ITEM_KEY ) {

        _tennantId = options.tennantId;

        return pubcon.http.authorized( {
                "method": "DELETE",
                "mode": "cors",
                "url": apiURL
            } )
            .then( function ( response ) {

                if ( response.ok ) {

                    return response.json();

                }

            } );

    }

    //cache items in IDB to keep data as close as possible to the glass
    function getLocalItems( options, ITEM_KEY ) {

        //should provide a tennant filter since even with the 
        //super user we only want to display items based on the 
        //specific tennant. The getLocalItems will skip this filter
        //if null
        _tennantId = options.tennantId;

        if ( !_tennantId && !options.noTennant ) {
            throw "no tennant supplied";
        } else if ( !_tennantId ) {
            _tennantId = "";
        }

        var dt = new Date();

        return localforage.getItem( _tennantId + ITEM_KEY + _STALE_KEY )
            .then( function ( expires ) {

                if ( expires >= dt ) {

                    return localforage.getItem( _tennantId + ITEM_KEY );

                } else {

                    return localforage.removeItem( _tennantId + ITEM_KEY )
                        .then( function () {
                            return localforage.removeItem( _tennantId + ITEM_KEY + _STALE_KEY );
                        } );

                }

            } );

    }

    function saveLocalItems( items, tennantId, ITEM_KEY, expires ) {

        tennantId = tennantId || _tennantId;

        expires = expires || MAX_LIST_CACHE;

        return localforage.setItem( tennantId + ITEM_KEY, items )
            .then( function () {

                var dt = new Date();

                dt.setMinutes( dt.getMinutes() + expires );

                return localforage
                    .setItem( tennantId + ITEM_KEY + _STALE_KEY, dt );

            } )
            .then( function () {
                return items;
            } );
    }

    //standard crud patterns & routines
    pubcon.data = {

        getItem: getItem,

        getItems: getItems,

        updateItem: updateItem,

        deleteItem: deleteItem

    };

}() );