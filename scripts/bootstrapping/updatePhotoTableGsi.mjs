// Call this script like this:
// node --experimental-modules getDatasourceArn.mjs DataSourceName

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
var DynamoDB = new AWS.DynamoDB({ region: REGION });

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function deleteGsi(tableName, indexName) {
    console.log(`Deleting ${indexName} GSI from ${tableName} (this normally takes under a minute) ...`);
    const params = {
        TableName: tableName,
        GlobalSecondaryIndexUpdates: [
            {
                Delete: {
                    IndexName: indexName
                }
            }
        ]
    }
    return DynamoDB.updateTable(params).promise();
}

async function createGsi(tableName, indexName) {
    console.log(`Creating ${indexName} GSI on ${tableName} (this normally takes several minutes) ...`);
    const params = {
        TableName: tableName,
        GlobalSecondaryIndexUpdates: [
            {
                Create: {
                    IndexName: indexName,
                    KeySchema: [
                        { KeyType: 'HASH', AttributeName: 'photoAlbumId' },
                        { KeyType: 'RANGE', AttributeName: 'createdAt' },
                    ],
                    Projection: {
                        ProjectionType: 'ALL'
                    },
                    ProvisionedThroughput: {
                        ReadCapacityUnits: 3,
                        WriteCapacityUnits: 3
                    }
                }
            }
        ],
        AttributeDefinitions: [
            { AttributeName: 'photoAlbumId', AttributeType: 'S' },
            { AttributeName: 'createdAt', AttributeType: 'N' }
        ]
    }
    return DynamoDB.updateTable(params).promise();
}

async function waitForActive(tableName, checkFn) {
    console.log(`Waiting for ${tableName} to become active...`)
    let sleepSecs = 5;
    let i = 0;
    let notActive = true;
    const check = checkFn || (() => true);
    while (notActive) {
        await sleep(sleepSecs * 1000);
        if (i % (60 / sleepSecs) === 0) {
            console.log('Still waiting...');
        }
        i = i + 1;
        const table = await DynamoDB.describeTable({TableName: tableName}).promise();
        if (table.Table.TableStatus === 'ACTIVE' && check(table)) notActive = false;
    }
}


async function getDynamoTableName(dataSourceName) {
    const params = { apiId: APPSYNC_API_ID };
    const dataSources = (await appsync.listDataSources(params).promise()).dataSources;
    const dataSource = dataSources.find(ds => ds.name === dataSourceName);

    return dataSource.dynamodbConfig.tableName;
}

async function main() {
    const tableName = await getDynamoTableName('PhotoTable');
    await deleteGsi(tableName, 'gsi-AlbumPhotos')
    await waitForActive(tableName);
    await createGsi(tableName, 'gsi-AlbumPhotos');
    await waitForActive(tableName, (t => t.Table.GlobalSecondaryIndexes[0].IndexStatus === 'ACTIVE'))

    console.log('Done updating PhotoTable GSI');
}

main();