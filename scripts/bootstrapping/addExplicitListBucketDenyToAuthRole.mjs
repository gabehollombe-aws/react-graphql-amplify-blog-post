import fs from 'fs';

// Simple DIRNAME support for mjs modules running with --experimental-modules flag 
// via https://github.com/nodejs/node/issues/16844
const FILENAME = typeof __filename !== 'undefined' ? __filename : (/^ +at (?:file:\/*(?=\/)|)(.*?):\d+:\d+$/m.exec(Error().stack) || '')[1];
const DIRNAME = typeof __dirname !== 'undefined' ? __dirname : FILENAME.replace(/[\/\\][^\/\\]*?$/, '');

const amplifyMeta = JSON.parse(fs.readFileSync(`${DIRNAME}/../../amplify/backend/amplify-meta.json`));
const REGION = amplifyMeta.providers.awscloudformation.Region;
var AUTH_ROLE_NAME = amplifyMeta.providers.awscloudformation.AuthRoleName;

import AWS from 'aws-sdk';
var IAM = new AWS.IAM();

function putRolePolicy() {
    console.log(`Explicitly denying s3:ListBucket for RoleName: ${AUTH_ROLE_NAME} ...`);
    const policyDocument = JSON.stringify({
        "Version": "2012-10-17",
        "Statement": [{
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": [
                "*"
            ],
            "Effect": "Deny"
        }]
    });

    var params = {
        PolicyDocument: policyDocument,
        PolicyName: "DenyListS3Buckets",
        RoleName: AUTH_ROLE_NAME
    };
    return IAM.putRolePolicy(params).promise();
}

async function main() {
    await putRolePolicy();
    console.log('Done.');
}

main();