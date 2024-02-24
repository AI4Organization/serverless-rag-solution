import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { ServerlessDataIngestionStackProps } from './ServerlessDataIngestionStackProps';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';

export class ServerlessDataIngestionStack extends cdk.NestedStack {
    constructor(scope: Construct, id: string, props: ServerlessDataIngestionStackProps) {
        super(scope, id, props);

        const masterS3Bucket = new s3.Bucket(this, `${props.AppName}-${props.environment}-${props.deployRegion}-masterS3Bucket`, {
            bucketName: props.s3MasterBucketName,
            encryption: s3.BucketEncryption.S3_MANAGED,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            publicReadAccess: false,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            accessControl: s3.BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
            versioned: true,
        });

        const s3FileTransferQueue = new sqs.Queue(this, `${props.resourcePrefix}-s3FileTransferQueue`, {
            visibilityTimeout: cdk.Duration.seconds(60), // 60 seconds
            queueName: `${props.resourcePrefix}-${props.deployEnvironment}-s3FileTransferQueue`,
            encryption: sqs.QueueEncryption.SQS_MANAGED,
            retentionPeriod: cdk.Duration.days(3), // 3 days
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        // lambda function to transfer s3 object from masterS3Bucket to preCachedPdfS3Bucket
        const s3ObjectTransferLambdaFn = new PythonFunction(this, `${props.resourcePrefix}-s3ObjectTransferLambdaFn`, {
            functionName: `${props.resourcePrefix}-fs3ObjectTransferLambdaFn`,
            runtime: cdk.aws_lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, '../../src/lambdas/s3-file-transfer/index.ts'),
            handler: 'handler',
            environment: {
                S3_CX_CACHED_PDF_FILES_BUCKET_NAME: this.preCachedPdfS3Bucket.bucketName,
                S3_FILE_TRANSFER_QUEUE_URL: s3FileTransferQueue.queueUrl,
            },
            role: new cdk.aws_iam.Role(this, `${props.resourcePrefix}-s3ObjectTransferLambdaFnRole`, {
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
                    // define policy to allow lambda to putObject and putObjectAcl to preCachedPdfS3Bucket
                    preCachedPdfS3BucketPolicy: new cdk.aws_iam.PolicyDocument({
                        statements: [
                            new cdk.aws_iam.PolicyStatement({
                                actions: ['s3:ListBucket'],
                                resources: [this.preCachedPdfS3Bucket.bucketArn],
                            }),
                            new cdk.aws_iam.PolicyStatement({
                                actions: ['s3:PutObject'],
                                resources: [`${this.preCachedPdfS3Bucket.bucketArn}/*`],
                            }),
                            new cdk.aws_iam.PolicyStatement({
                                actions: ['s3:PutObjectAcl'],
                                resources: [`${this.preCachedPdfS3Bucket.bucketArn}/*`],
                            }),
                            new cdk.aws_iam.PolicyStatement({
                                actions: ['s3:PutObjectTagging'],
                                resources: [`${this.preCachedPdfS3Bucket.bucketArn}/*`],
                            }),
                            new cdk.aws_iam.PolicyStatement({
                                actions: ['s3:PutObjectVersionAcl'],
                                resources: [`${this.preCachedPdfS3Bucket.bucketArn}/*`],
                            }),
                            new cdk.aws_iam.PolicyStatement({
                                actions: ['s3:PutObjectVersionTagging'],
                                resources: [`${this.preCachedPdfS3Bucket.bucketArn}/*`],
                            }),
                        ],
                    }),
                },
            }),
            timeout: cdk.Duration.seconds(60), // one minute
            architecture: lambda.Architecture.ARM_64,
            logGroup: new cdk.aws_logs.LogGroup(this, `${props.resourcePrefix}-s3ObjectTransferLambdaFnLogGroup`, {
                logGroupName: `${props.resourcePrefix}-s3ObjectTransferLambdaFnLogGroup`,
                removalPolicy: cdk.RemovalPolicy.DESTROY,
                retention: cdk.aws_logs.RetentionDays.ONE_WEEK,
            }),
            memorySize: 1024,
            bundling: {
                minify: true,
                sourceMap: true,
                sourcesContent: false,
                esbuildVersion: '0.20.1',
                target: 'es2020',
                format: OutputFormat.ESM,
                forceDockerBundling: true,
            },
            projectRoot: path.join(__dirname, '../../src/lambdas/s3-file-transfer'),
            depsLockFilePath: path.join(__dirname, '../../src/lambdas/s3-file-transfer/package-lock.json'),
        });

        // grant permission for textractResultQueue to invoke s3ObjectTransferLambdaFn
        s3ObjectTransferLambdaFn.addPermission('AllowSQSInvocation', {
            action: 'lambda:InvokeFunction',
            principal: new iam.ServicePrincipal('sqs.amazonaws.com'),
            sourceArn: s3FileTransferQueue.queueArn,
        });

        // Add the SQS queue as an event source for the s3ObjectTransferLambdaFn function
        s3ObjectTransferLambdaFn.addEventSource(new lambdaEventSources.SqsEventSource(s3FileTransferQueue, {
            batchSize: 10, // Set the batch size to 10
            reportBatchItemFailures: true, // Allow functions to return partially successful responses for a batch of records.
            enabled: true,
            maxBatchingWindow: cdk.Duration.seconds(60), // 60 seconds
        }));

        // Configure S3 event notifications to send a message to s3FileTransferQueue when a new object is created
        masterS3Bucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.SqsDestination(s3FileTransferQueue));

        // print out masterS3Bucket bucket name
        new cdk.CfnOutput(this, `${props.resourcePrefix}-MasterS3Bucket-Name`, {
            value: masterS3Bucket.bucketName,
            exportName: `${props.resourcePrefix}-MasterS3Bucket-Name`,
            description: 'Master S3 Bucket Name.',
        });
    }
}
