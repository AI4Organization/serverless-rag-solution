import * as cdk from 'aws-cdk-lib';
import { CxTextAnalysisBaseStackProps } from '../ServerlessRagSolutionStackProps';

/**
 * Properties for the ServerlessDataIngestionStack.
 * @property {string} S3MasterBucketName - The name of the S3 bucket for storing PDF files.
 */
export interface ServerlessDataIngestionStackProps extends CxTextAnalysisBaseStackProps, cdk.NestedStackProps {
    readonly s3MasterBucketName: string;
}
