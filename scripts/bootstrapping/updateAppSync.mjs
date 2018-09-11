// Call this script like this:
// node --experimental-modules build.mjs

import AWS from 'aws-sdk';
import fs from 'fs';

// Simple DIRNAME support for mjs modules running with --experimental-modules flag 
// via https://github.com/nodejs/node/issues/16844
const FILENAME = typeof __filename !== 'undefined' ? __filename : (/^ +at (?:file:\/*(?=\/)|)(.*?):\d+:\d+$/m.exec(Error().stack) || '')[1];
const DIRNAME = typeof __dirname !== 'undefined' ? __dirname : FILENAME.replace(/[\/\\][^\/\\]*?$/, '');

const amplifyMeta = JSON.parse(fs.readFileSync(`${DIRNAME}/../../amplify/backend/amplify-meta.json`));
const REGION = amplifyMeta.providers.awscloudformation.Region;
var APPSYNC_API_ID = amplifyMeta.api[Object.keys(amplifyMeta.api)[0]].output.GraphQLAPIIdOutput;

var appsync = new AWS.AppSync({ region: REGION });


async function createAlbum_resolver() {
    console.log('Updating createAlbum resolver...');
    var requestMappingTemplate = `
        ## START: Prepare DynamoDB PutItem Request. **
        $util.qr($context.args.input.put("createdAt", $util.time.nowISO8601()))
        $util.qr($context.args.input.put("updatedAt", $util.time.nowISO8601()))
        $util.qr($context.args.input.put("__typename", "Album"))
        $util.qr($context.args.input.put("owner", $context.identity.username))
        
        #set($attributes = $util.dynamodb.toMapValues($context.arguments.input))
		#set($attributes.members = $util.dynamodb.toStringSet(["$context.identity.username"]))

        {
        "version": "2017-02-28",
        "operation": "PutItem",
        "key": {
            "id": {
                "S": "$util.autoId()"
            }
        },
        "attributeValues": $util.toJson($attributes),
        "condition": {
            "expression": "attribute_not_exists(#id)",
            "expressionNames": {
                "#id": "id"
            }
        }
        }
        ## END: Prepare DynamoDB PutItem Request. **
    `;
    var responseMappingTemplate = `
        $util.toJson($context.result)
    `;

    var params = {
        apiId: APPSYNC_API_ID,
        typeName: 'Mutation',
        fieldName: 'createAlbum',
    };
    await appsync.deleteResolver(params).promise();

    var params = {
        apiId: APPSYNC_API_ID,
        dataSourceName: 'AlbumTable',
        typeName: 'Mutation',
        fieldName: 'createAlbum',
        requestMappingTemplate, 
        responseMappingTemplate
    };
    return appsync.createResolver(params).promise();
}

async function getAlbum_resolver() {
    console.log('Updating getAlbum resolver...');
    var requestMappingTemplate = `
        {
            "version": "2017-02-28",
            "operation": "GetItem",
            "key": {
                "id": $util.dynamodb.toDynamoDBJson($ctx.args.id)
            }
        }
    `;
    var responseMappingTemplate = `
        #if ($context.result.members.contains($context.identity.username))
            $util.toJson($context.result)
        #else
            $util.unauthorized()
        #end
    `;
    var params = {
        apiId: APPSYNC_API_ID,
        typeName: 'Query',
        fieldName: 'getAlbum',
    };
    await appsync.deleteResolver(params).promise();

    var params = {
        apiId: APPSYNC_API_ID,
        dataSourceName: 'AlbumTable',
        typeName: 'Query',
        fieldName: 'getAlbum',
        requestMappingTemplate, 
        responseMappingTemplate
    };
    return appsync.createResolver(params).promise();
}

async function addUsernameToAlbum_resolver() {
    console.log('Creating addUsernameToAlbum resolver...');
    var requestMappingTemplate = `
        {
            "version" : "2017-02-28",
            "operation" : "UpdateItem",
            "key" : {
                "id": $util.dynamodb.toDynamoDBJson($ctx.args.albumId)
            },
            "update" : {
                "expression" : "ADD #members :username",
                "expressionNames" : {
                    "#members" : "members"
                },
                "expressionValues" : {
                    ":username" : $util.dynamodb.toStringSetJson([$ctx.args.username])
                }    
            }
        }
    `;
    var responseMappingTemplate = `
        ## Pass back the result from DynamoDB. **
        $util.toJson($ctx.result)
    `;

    var params = {
        apiId: APPSYNC_API_ID,
        typeName: 'Mutation',
        fieldName: 'addUsernameToAlbum',
    };
    await appsync.deleteResolver(params).promise();
    
    var params = {
        apiId: APPSYNC_API_ID,
        dataSourceName: 'AlbumTable',
        typeName: 'Mutation',
        fieldName: 'addUsernameToAlbum',
        requestMappingTemplate, 
        responseMappingTemplate
    };
    return appsync.createResolver(params).promise();
}

async function listAlbums_resolver() {
    console.log('Creating listAlbums resolver...');
    var requestMappingTemplate = `
        #set( $limit = $util.defaultIfNull($context.args.limit, 10) )
        {
            "version": "2017-02-28",
            "operation": "Scan",
            "filter" : {
                "expression" : "contains(members, :cognitoId)",
                "expressionValues" : {
                ":cognitoId":  $util.dynamodb.toDynamoDBJson($ctx.identity.username)
                }
            },
            "limit": $limit,
            "nextToken":   #if( $context.args.nextToken )
                "$context.args.nextToken"
            #else
                null
            #end
        }
    `;
    var responseMappingTemplate = `
        ## Pass back the result from DynamoDB. **
        $util.toJson($ctx.result)
    `;

    var params = {
        apiId: APPSYNC_API_ID,
        typeName: 'Query',
        fieldName: 'listAlbums',
    };
    await appsync.deleteResolver(params).promise();

    var params = {
        apiId: APPSYNC_API_ID,
        dataSourceName: 'AlbumTable',
        typeName: 'Query',
        fieldName: 'listAlbums',
        requestMappingTemplate, 
        responseMappingTemplate
    };
    return appsync.createResolver(params).promise();
}

async function addMembersToAlbumType() {
    console.log('Adding `members: [String]` to Album type ...');
    var definition = `
        type Album {
            id: ID!
            name: String!
            owner: String!
            members: [String!]
            photos(
                filter: ModelPhotoFilterInput,
                sortDirection: ModelSortDirection,
                limit: Int,
                nextToken: String
            ): ModelPhotoConnection
        }
    `;
    var params = {
        apiId: APPSYNC_API_ID,
        format: 'SDL',
        typeName: 'Album',
        definition
    };
    return appsync.updateType(params).promise();
}

async function updateMutations() {
    console.log('Updating mutations ...');
    var definition = `
        type Mutation {
            addUsernameToAlbum(username: String!, albumId: String!): Album
            createAlbum(input: CreateAlbumInput!): Album
            updateAlbum(input: UpdateAlbumInput!): Album
            deleteAlbum(input: DeleteAlbumInput!): Album
            createPhoto(input: CreatePhotoInput!): Photo
            updatePhoto(input: UpdatePhotoInput!): Photo
            deletePhoto(input: DeletePhotoInput!): Photo
        } 
    `
    var params = {
        apiId: APPSYNC_API_ID,
        format: 'SDL',
        typeName: 'Mutation',
        definition
    };
    return appsync.updateType(params).promise();
}


async function main() {
    console.log('Updating AppSync...');
    await addMembersToAlbumType();
    await updateMutations();
    await createAlbum_resolver();
    await getAlbum_resolver();
    addUsernameToAlbum_resolver();
    console.log('Done.');
}

main();