import path from 'path';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { ServerlessDataRetrievalStackProps } from './ServerlessDataRetrievalStackProps';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';

export class ServerlessDataRetrievalStack extends cdk.NestedStack {
    constructor(scope: Construct, id: string, props: ServerlessDataRetrievalStackProps) {
        super(scope, id, props);

        // lambda function to transfer s3 object from masterS3Bucket to preCachedPdfS3Bucket
        const dataRetrieveLambdaFn = new PythonFunction(this, `${props.appName}-dataRetrieveLambdaFn`, {
            functionName: `${props.appName}-dataRetrieveLambdaFn`,
            runtime: cdk.aws_lambda.Runtime.PYTHON_3_11,
            entry: path.join(__dirname, '../src/lambdas/vector-db-retrieval'),
            handler: "handler",
            architecture: lambda.Architecture.ARM_64,
            runtimeManagementMode: lambda.RuntimeManagementMode.AUTO,
            timeout: cdk.Duration.seconds(60), // one minute
            logGroup: new cdk.aws_logs.LogGroup(this, `${props.appName}-dataRetrieveLambdaFn-logGroup`, {
                logGroupName: `${props.appName}-dataRetrieveLambdaFn-logGroupName`,
                removalPolicy: cdk.RemovalPolicy.DESTROY,
                retention: cdk.aws_logs.RetentionDays.ONE_WEEK,
            }),
            memorySize: 1024, // 1GB
        });
    }
}
