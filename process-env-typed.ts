export interface IEnvTypes {
    APP_NAME: string;
    S3_CX_CACHED_PDF_FILES_BUCKET_NAME: string;
    S3_CX_CACHED_TEXT_FILES_BUCKET_NAME: string;
    S3_CX_PRE_CACHED_PDF_FILES_BUCKET_NAME: string;
    ENVIRONMENT: string;
    POSTGRES_DB_URL: string;
    POSTGRES_DB_SG_ID: string;
    POSTGRES_DB_ARN: string;
    VPC_ID: string;
}

export const envTypes: IEnvTypes = {
    APP_NAME: process.env.APP_NAME,
    S3_CX_CACHED_PDF_FILES_BUCKET_NAME: process.env.S3_CX_CACHED_PDF_FILES_BUCKET_NAME,
    S3_CX_CACHED_TEXT_FILES_BUCKET_NAME: process.env.S3_CX_CACHED_TEXT_FILES_BUCKET_NAME,
    S3_CX_PRE_CACHED_PDF_FILES_BUCKET_NAME: process.env.S3_CX_PRE_CACHED_PDF_FILES_BUCKET_NAME,
    ENVIRONMENT: process.env.ENVIRONMENT!,
    POSTGRES_DB_URL: process.env.POSTGRES_DB_URL!,
    POSTGRES_DB_SG_ID: process.env.POSTGRES_DB_SG_ID!,
    POSTGRES_DB_ARN: process.env.POSTGRES_DB_ARN!,
    VPC_ID: process.env.VPC_ID!,
};
