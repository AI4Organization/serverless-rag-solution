import * as cdk from 'aws-cdk-lib';

/**
 * Properties for the CxTextAnalysisStack.
 *
 * @property {string} vpcId - The ID of the VPC where the service will be deployed.
 * @property {string[]} vpcPrivateEgressSubnetIds - The IDs of the private subnets where the database should be accessible.
 * @property {string[]} vpcPrivateEgressSubnetAzs - The availability zones of the private subnets where the database should be accessible.
 * @property {string[]} vpcPrivateEgressSubnetRouteTableIds - The route table IDs of the private subnets where the database should be accessible.
 */
export interface CxTextAnalysisStackProps extends CxTextAnalysisBaseStackProps, cdk.StackProps {
    readonly vpcId: string;
    readonly vpcPrivateEgressSubnetIds: string[];
    readonly vpcPrivateEgressSubnetAzs: string[];
    readonly vpcPrivateEgressSubnetRouteTableIds: string[];
}

/**
 * Properties for the CxTextAnalysisBaseStack.
 * @property {string} AppName - The name of the application.
 * @property {string | undefined} deployRegion - The AWS region where the service will be deployed.
 * @property {string} environment - The environment where the service will be deployed.
 */
export interface CxTextAnalysisBaseStackProps {
    readonly AppName: string;
    readonly deployRegion: string | undefined;
    readonly environment: string;
}
