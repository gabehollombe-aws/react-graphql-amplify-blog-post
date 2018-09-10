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


async function getDynamoArnFromDataSource(dataSourceName) {
    const params = { apiId: APPSYNC_API_ID };
    const dataSources = (await appsync.listDataSources(params).promise()).dataSources;
    const dataSource = dataSources.find(ds => ds.name === dataSourceName);

    // ugly hack to get a dynamodb ARN using what we know in the response
    const dataSourceArn = dataSource.dataSourceArn;
    let dynamoArn = dataSourceArn.replace('appsync', 'dynamodb');
    dynamoArn = dynamoArn.split('/')[0];
    dynamoArn = dynamoArn.replace('apis', 'table');
    dynamoArn = dynamoArn + "/" + dataSource.dynamodbConfig.tableName;
    return dynamoArn;
}

async function main() {
    console.log(await getDynamoArnFromDataSource(process.argv[2]));
}

main();