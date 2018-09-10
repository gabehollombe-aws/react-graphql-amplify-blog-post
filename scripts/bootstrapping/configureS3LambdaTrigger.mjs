import AWS from 'aws-sdk';

import fs from 'fs';

// Simple DIRNAME support for mjs modules running with --experimental-modules flag 
// via https://github.com/nodejs/node/issues/16844
const FILENAME = typeof __filename !== 'undefined' ? __filename : (/^ +at (?:file:\/*(?=\/)|)(.*?):\d+:\d+$/m.exec(Error().stack) || '')[1];
const DIRNAME = typeof __dirname !== 'undefined' ? __dirname : FILENAME.replace(/[\/\\][^\/\\]*?$/, '');

const amplifyMeta = JSON.parse(fs.readFileSync(`${DIRNAME}/../../amplify/backend/amplify-meta.json`));
const REGION = amplifyMeta.providers.awscloudformation.Region;
var STORAGE_BUCKET = amplifyMeta.storage[Object.keys(amplifyMeta.storage)[0]].output.BucketName;

const S3 = new AWS.S3();
const CF = new AWS.CloudFormation({region: REGION});


async function getLambdaArn(stackName) {
    const stacks = (await CF.describeStacks().promise()).Stacks;
    const stack = stacks.find(s => s.StackName === stackName);
    const lambdaOutput = stack.Outputs.find(o => o.OutputKey === 'PhotoProcessorFunction');
    return lambdaOutput.OutputValue;
}

async function configureS3LambdaTrigger(bucketName, lambdaArn) {
    var params = {
        Bucket: bucketName,
        NotificationConfiguration: {
            "LambdaFunctionConfigurations": [{
                "Id": "S3PutTriggersLambda",
                "LambdaFunctionArn": lambdaArn,
                "Events": ["s3:ObjectCreated:Put"],
                "Filter": {
                    "Key": {
                        "FilterRules": [
                            {
                                "Name": "prefix",
                                "Value": "uploads/"
                            } 
                        ]
                    }
                }
            }]
        }
    };
    return S3.putBucketNotificationConfiguration(params).promise()
}

async function main() {
    const [_, __, stackName] = process.argv;
    const lambdaArn = await getLambdaArn(stackName);
    await configureS3LambdaTrigger(STORAGE_BUCKET, lambdaArn);
}

main();