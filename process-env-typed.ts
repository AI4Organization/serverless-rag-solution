export interface IEnvTypes {
    APP_NAME: string;
    VPC_ID: string;
}

export const envTypes: IEnvTypes = {
    APP_NAME: process.env.APP_NAME,
    VPC_ID: process.env.VPC_ID!,
};
