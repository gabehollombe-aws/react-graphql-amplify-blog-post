# Build your own multi-user photo album app with React, GraphQL, and AWS  Amplify

## Pre-requisites
**An AWS account** - If you don't have one yet, you'll need an account with AWS. Creating an AWS account is free and gives you immediate access to the AWS Free Tier. For more information, or to sign up for an account, see https://aws.amazon.com/free/

**Node.js installed** - We'll be using some JavaScript tools and packages which require Node.js (and NPM, which comes with Node.js) to be installed. You can download an installer or find instructions for installing Node.js at https://nodejs.org/en/download/

**The AWS Amplify CLI installed and configured** - The AWS Amplify CLI helps you quickly configure serverless backends and includes support for authentication, analytics, functions, REST/GraphQL APIs, and more. Follow the installation instructions at https://github.com/aws-amplify/amplify-cli

**Install the SAM CLI** - This app uses a tool from AWS to help with packaging and deploying AWS Lambda functions called the AWS Serverless Application Model (SAM) and the SAM CLI. Please follow the installation instructions for the SAM CLI, which will also require you to install Docker: https://github.com/awslabs/aws-sam-cli/blob/develop/docs/installation.rst

## Build instructions
After checking out this code, you'll need to run the following commands to get this app to work.
**In your terminal, from within the same directory as this README, perform these steps:**

### 1. Initialize Amplify
Run: `amplify init`

Answer the questions like this:
- Choose your default editor: `<anything you want>`
- Choose the type of app that you're building `javascript
- Please tell us about your project
- What javascript framework are you using `react`
- Source Directory Path:  `src`
- Distribution Directory Path: `build`
- Build Command:  `npm run-script build`
- Start Command: `npm run-script start`
- Do you want to use an AWS profile? `<either answer is fine, it's up to you>`

Wait for `amplify init` to finish ...

### 2. Add authentication
Run: `amplify auth add`

Answer the questions like this:
-  Do you want to use the default authentication and security configuration? `Yes, use the default configuration.`

Run `amplify push`, Press `Enter/Return` to continue, and wait for it to finish ...

### 3. Add a GraphQL API
Run: `amplify api add`

Answer the questions like this:
- Please select from one of the below mentioned services `GraphQL`
- Provide API name: `<whatever you want -- I suggest 'photoAlbumsDemo'>`
- Choose an authorization type for the API `Amazon Cognito User Pool`
- Do you have an annotated GraphQL schema? `Yes`
- Provide your schema file path: `scripts/bootstrapping/schema.graphql`

Run `amplify push`, Press `Enter/Return` to continue, and wait for it to finish ...

### 4. Add S3 file storage
Run: `amplify storage add`

Answer the questions like this:
- Please select from one of the below mentioned services `Content (Images, audio, video, etc.)`
- Please provide a friendly name for your resource that will be used to label this category in the project: `photostorage`
- Please provide bucket name: `<accept the default value>`
- Who should have access: `Auth users only`
- What kind of access do you want for Authenticated users `read/write`

Run `amplify push`, Press `Enter/Return` to continue, and wait for it to finish ...

### 5. Run a script to update some of the AWS resources for this codebase
Run: `npm run bootstrap`

**What this script does:** 
- Runs `npm install` for the React app as well as the `photo_processor` Lambda function
- Looks up values for resources created by the Amplify CLI commands from above and uses them to package and deploy the `photo_processor` Lambda function
- Looks up the API ID of your AppSync API that Amplify created and updates resolvers to be in-line with what this codebase expects (so you don't need to make manual changes to the Resolvers in the AppSync web console). 

Notes:
- Ths script uses credentials stored in ~/.aws/credentials (macOS/Linux) or C:\Users\USER_NAME\.aws\credentials (Windows). 
- If you have a specific AWS credentials profile you want to use, prefix the command with AWS_PROFILE=name-of-profile
- It requires Node.js version 8 or higher and Docker to be installed

### 6. Start the app

Run `npm start` to start the app. Hopefully, everything should work at this point. :)