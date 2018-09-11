#!/bin/bash
set -e
set -x

# Get dir of script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"
pushd $DIR

# Install npm deps for app
pushd ../../
npm install
popd

# Install npm deps for photo_processor lambda
pushd ../../photo_processor/src
docker run -v "$PWD":/var/task lambci/lambda:build-nodejs8.10 npm install
popd

# Get deployment bucket as a destination we can use for CloudFormation templates
SCRIPT="
    var fs = require('fs');
    var amplifyMeta = JSON.parse(fs.readFileSync('../../amplify/backend/amplify-meta.json'));
    var bucketName = amplifyMeta.providers.awscloudformation.DeploymentBucketName;
    console.log(bucketName);
"
DEPLOYMENT_BUCKET=$(node -e "$SCRIPT")

# Get Storage bucket name and Photos Table ARN
STORAGE_BUCKET_NAME=$(node --experimental-modules getStorageBucket.mjs)
PHOTOS_TABLE_ARN=$(node --experimental-modules getDynamoArnFromDataSourceName.mjs PhotoTable)

# Package and deploy photo_procesor
pushd ../../photo_processor
STACK_NAME=PhotoAlbumsProcessorSAMStack
sam package \
--template-file template.yaml \
--output-template-file packaged.yml \
--s3-bucket $DEPLOYMENT_BUCKET
sam deploy \
--template-file packaged.yml \
--stack-name $STACK_NAME \
--capabilities CAPABILITY_IAM \
--region us-east-1 \
--parameter-overrides \
S3UserfilesBucketArn=arn:aws:s3:::$STORAGE_BUCKET_NAME \
DynamoDBPhotosTableArn=$PHOTOS_TABLE_ARN || true
popd

# Trigger photo_processor when uploads go into storage bucket
node --experimental-modules configureS3LambdaTrigger.mjs $STACK_NAME

# Deny S3 ListBucket to authed users
node --experimental-modules addExplicitListBucketDenyToAuthRole.mjs

# Update the PhotoTable GSI
node --experimental-modules updatePhotoTableGsi.mjs

# Update AppSync
node --experimental-modules updateAppSync.mjs

popd
