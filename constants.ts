import * as pulumi from "@pulumi/pulumi";

const env = pulumi.getStack();
// export const CNPG_NAMESPACE = `${env}-cnpg-ns`;
export const RC_APP_NAMESPACE =`${env}-rc-app-ns`;
// export const RC_DATABASE_NAMESPACE = `${env}-pg-ns`;
export const RC_PG_NAMESPACE = `${env}-rc-pg-ns`;
export const REDIS_NAMESPACE = `${env}-redis-ns`;
export const ESO_NAMESPACE = `${env}-eso-ns`;
export const CILIUM_RELEASE_NAME = `${env}-cilium`;
export const NGINX_DEPLOYMENT_NAME = `${env}-nginx`;
export const DEMOAPPS_NAME = `${env}-demoapps`;
export const GATEWAY_NAME = `${env}-gateway`;
export const GATEWAY_CRD = `${env}-gatewaycrd`;
export const K8S_CLUSTER_NAME = `${env}-cluster`;
export const RC_DATABASE_NAME = `${env}-rc-database`;

export const RC_APP_NAME = `${env}-rc-app`;

export const REDIS_NAME = `${env}-redis`;


export const DO_CLUSTER_NAME = `${env}-daksha-cluster`;
export const DO_NODE_POOL_NAME = `${env}-daksha-pool`;

export const PULUMI_ORGANIZATION = "gmkumar2005";
export const CNPG_SECRET = `${env}-cnpg-secret`;
export const CNPG_SECRET_DB = `${env}-cnpg-secret-db`;
export const CNPG_SECRET_APP = `${env}-cnpg-secret-app`;
export const CNPG_SECRET_STORE = `${env}-cnpg-secret-store`;
