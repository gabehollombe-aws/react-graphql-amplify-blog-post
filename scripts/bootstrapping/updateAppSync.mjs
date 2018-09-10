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


async function createAlbum_addUsernameAsOwner() {
    console.log('Updating createAlbum request mapping template...');
    var requestMappingTemplate = `
        ## START: Prepare DynamoDB PutItem Request. **
        $util.qr($context.args.input.put("createdAt", $util.time.nowISO8601()))
        $util.qr($context.args.input.put("updatedAt", $util.time.nowISO8601()))
        $util.qr($context.args.input.put("__typename", "Album"))
        $util.qr($context.args.input.put("owner", $context.identity.username))
        {
        "version": "2017-02-28",
        "operation": "PutItem",
        "key": {
            "id": {
                "S": "$util.autoId()"
            }
        },
        "attributeValues": $util.dynamodb.toMapValuesJson($context.args.input),
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

async function main() {
    await createAlbum_addUsernameAsOwner();
    console.log('Done');
}

main();