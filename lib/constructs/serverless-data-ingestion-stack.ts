import path from 'path';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as iam from 'aws-cdk-lib/aws-iam';
import { ServerlessDataIngestionStackProps } from './ServerlessDataIngestionStackProps';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';

export class ServerlessDataIngestionStack extends cdk.NestedStack {
    constructor(scope: Construct, id: string, props: ServerlessDataIngestionStackProps) {
        super(scope, id, props);

        const masterS3Bucket = new s3.Bucket(this, `${props.appName}-${props.environment}-${props.deployRegion}-masterS3Bucket`, {
            bucketName: `${props.appName}-${props.deployRegion}-${props.environment}-${props.s3MasterBucketName}`,
            encryption: s3.BucketEncryption.S3_MANAGED,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            publicReadAccess: false,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            accessControl: s3.BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
            versioned: true,
        });

        const s3FileIngestionQueue = new sqs.Queue(this, `${props.appName}-s3FileIngestionQueue`, {
            visibilityTimeout: cdk.Duration.seconds(60), // 60 seconds
            queueName: `${props.appName}-${props.deployRegion}-${props.environment}-s3FileIngestionQueue`,
            encryption: sqs.QueueEncryption.SQS_MANAGED,
            retentionPeriod: cdk.Duration.days(3), // 3 days
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // lambda function to transfer s3 object from masterS3Bucket to preCachedPdfS3Bucket
        const s3FileIngestionLambdaFn = new PythonFunction(this, `${props.appName}-s3FileIngestionLambdaFn`, {
            functionName: `${props.appName}-s3FileIngestionLambdaFn`,
            runtime: cdk.aws_lambda.Runtime.PYTHON_3_11,
            entry: path.join(__dirname, '../src/lambdas/s3-file-ingestion'),
            handler: "handler",
            architecture: lambda.Architecture.ARM_64,
            runtimeManagementMode: lambda.RuntimeManagementMode.AUTO,
            environment: {
                S3_FILE_TRANSFER_QUEUE_URL: s3FileIngestionQueue.queueUrl,
            },
            role: new cdk.aws_iam.Role(this, `${props.appName}-s3FileIngestionLambdaFnRole`, {
                assumedBy: new cdk.aws_iam.ServicePrincipal('lambda.amazonaws.com'),
                managedPolicies: [
                    cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
                ],
                inlinePolicies: {
                    // define policy to allow lambda to getObject and getObjectAcl from masterS3Bucket
                    masterS3BucketPolicy: new cdk.aws_iam.PolicyDocument({
                        statements: [
                            new cdk.aws_iam.PolicyStatement({
                                actions: ['s3:ListBucket'],
                                resources: [masterS3Bucket.bucketArn],
                            }),
                            new cdk.aws_iam.PolicyStatement({
                                actions: ['s3:GetObject'],
                                resources: [`${masterS3Bucket.bucketArn}/*`],
                            }),
                            new cdk.aws_iam.PolicyStatement({
                                actions: ['s3:GetObjectAcl'],
                                resources: [`${masterS3Bucket.bucketArn}/*`],
                            }),
                            new cdk.aws_iam.PolicyStatement({
                                actions: ['s3:GetObjectTagging'],
                                resources: [`${masterS3Bucket.bucketArn}/*`],
                            }),
                            new cdk.aws_iam.PolicyStatement({
                                actions: ['s3:GetObjectVersion'],
                                resources: [`${masterS3Bucket.bucketArn}/*`],
                            }),
                            new cdk.aws_iam.PolicyStatement({
                                actions: ['s3:GetObjectVersionAcl'],
                                resources: [`${masterS3Bucket.bucketArn}/*`],
                            }),
                            new cdk.aws_iam.PolicyStatement({
                                actions: ['s3:GetObjectVersionTagging'],
                                resources: [`${masterS3Bucket.bucketArn}/*`],
                            }),
                        ],
                    }),
                    s3FileIngestionQueuePolicy: new cdk.aws_iam.PolicyDocument({
                        statements: [
                            new cdk.aws_iam.PolicyStatement({
                                actions: ['sqs:ReceiveMessage'],
                                resources: [s3FileIngestionQueue.queueArn],
                            }),
                            new cdk.aws_iam.PolicyStatement({
                                actions: ['sqs:ChangeMessageVisibility', 'sqs:GetQueueAttributes', 'sqs:GetQueueUrl'],
                                resources: [s3FileIngestionQueue.queueArn],
                            }),
                            new cdk.aws_iam.PolicyStatement({
                                actions: ['sqs:DeleteMessage'],
                                resources: [s3FileIngestionQueue.queueArn],
                            }),
                            new cdk.aws_iam.PolicyStatement({
                                actions: ['sqs:SendMessage'],
                                resources: [s3FileIngestionQueue.queueArn],
                            }),
                        ],
                    }),
                },
            }),
            timeout: cdk.Duration.seconds(60), // one minute
            logGroup: new cdk.aws_logs.LogGroup(this, `${props.appName}-s3FileIngestionLambdaFn-logGroup`, {
                logGroupName: `${props.appName}-s3FileIngestionLambdaFn-logGroupName`,
                removalPolicy: cdk.RemovalPolicy.DESTROY,
                retention: cdk.aws_logs.RetentionDays.ONE_WEEK,
            }),
            memorySize: 1024, // 1GB
        });

        // grant permission for textractResultQueue to invoke s3FileIngestionLambdaFn
        s3FileIngestionLambdaFn.addPermission('AllowSQSInvocation', {
            action: 'lambda:InvokeFunction',
            principal: new iam.ServicePrincipal('sqs.amazonaws.com'),
            sourceArn: s3FileIngestionQueue.queueArn,
        });

        // Add the SQS queue as an event source for the s3FileIngestionLambdaFn function
        s3FileIngestionLambdaFn.addEventSource(new lambdaEventSources.SqsEventSource(s3FileIngestionQueue, {
            batchSize: 10, // Set the batch size to 10
            reportBatchItemFailures: true, // Allow functions to return partially successful responses for a batch of records.
            enabled: true,
            maxBatchingWindow: cdk.Duration.seconds(60), // 60 seconds
        }));

        // Configure S3 event notifications to send a message to s3FileIngestionQueue when a new object is created
        masterS3Bucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.SqsDestination(s3FileIngestionQueue));

        // print out masterS3Bucket bucket name
        new cdk.CfnOutput(this, `${props.appName}-MasterS3BucketNameExporter`, {
            value: masterS3Bucket.bucketName,
            exportName: `${props.appName}-MasterS3BucketName`,
            description: 'Master S3 Bucket Name.',
        });
    }
}
