declare module NodeJS {
    interface ProcessEnv {
        [key: string]: string | undefined;
        CDK_DEPLOY_REGIONS: string;
        ENVIRONMENTS: string;
        APP_NAME: string;
        S3_CX_CACHED_PDF_FILES_BUCKET_NAME: string;
        S3_CX_CACHED_TEXT_FILES_BUCKET_NAME: string;
        S3_CX_PRE_CACHED_PDF_FILES_BUCKET_NAME: string;
        POSTGRES_DB_URL: string | undefined;
        POSTGRES_DB_SG_ID: string | undefined;
        POSTGRES_DB_ARN: string | undefined;
        VPC_ID: string | undefined;
    }
}
