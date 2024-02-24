import * as cdk from 'aws-cdk-lib';
import { CxTextAnalysisBaseStackProps } from '../ServerlessRagSolutionStackProps';

/**
 * Properties for the ServerlessDataRetrievalStack.
 */
export interface ServerlessDataRetrievalStackProps extends CxTextAnalysisBaseStackProps, cdk.NestedStackProps {
}
