import {KindCluster} from "./stacks/kind";
import {createCiliumDeployment} from "./stacks/cilium";
import {createNginxDeployment, NginxDeployment} from "./stacks/nginx";
import {createCnpgCrd} from "./stacks/cnpgcrd";
import * as pulumi from "@pulumi/pulumi";
import {createDemoApps} from "./stacks/demoapps";
import {createGatewayCrd} from "./stacks/gatewaycrd";
import {createGateway} from "./stacks/gateway";
import {createHttpRoute} from "./stacks/httpbinroute";
import {createColimaCluster} from "./stacks/colima";
import {createPgCluster} from "./stacks/pgcluster";
import { createRcApp } from "./stacks/rc-app";
import {createDebCredentials} from "./stacks/dbcredentials";

const env = pulumi.getStack();
const CNPG_NAMESPACE = `${env}-cnpg-system`;
const CILIUM_RELEASE_NAME = `${env}-cilium`;
const NGINX_DEPLOYMENT_NAME = `${env}-nginx`;
const DEMOAPPS_NAME = `${env}-demoapps`;
const GATEWAY_NAME = `${env}-gateway`;
const GATEWAY_CRD = `${env}-gatewaycrd`;
const K8S_CLUSTER_NAME = `${env}-cluster`;
const RC_DATABASE_NAME = `${env}-rc-database`;
const RC_DATABASE_NAMESPACE = `${env}-pg`;
const RC_APP_NAME = `${env}-rc-app`;
const RC_APP_NAMESPACE = "default"





// Create Kind cluster and get the Kubernetes provider
// const kindClusterComponent = new KindCluster("dev-cluster");
// const k8sProvider = kindClusterComponent.k8sProvider;
// const kindCluster = kindClusterComponent.kindCluster;

const colimaStart = createColimaCluster(K8S_CLUSTER_NAME);
const k8sProvider = colimaStart.k8sProvider;
const k8sCluster = colimaStart.colimaStart;

// Deploy Cilium on the cluster via the factory
// const ciliumDeployment = createCiliumDeployment(CILIUM_RELEASE_NAME, k8sProvider, [kindCluster,k8sProvider]);

const cnpgcrd = createCnpgCrd(CNPG_NAMESPACE, k8sProvider,[k8sProvider,k8sCluster]);
const demoApps =  createDemoApps(DEMOAPPS_NAME, k8sProvider, [cnpgcrd]);
const rcDatabase = createPgCluster(RC_DATABASE_NAMESPACE, k8sProvider, CNPG_NAMESPACE, RC_DATABASE_NAME, [cnpgcrd]);
// const rcAppCreds = createDebCredentials("rc-app-db-creds", {
//     namespace: "dev-cnpg-system",
//     secretName: "dev-pg-app",
// });

const rcAppCreds = createDebCredentials("rc-app-db-creds", {
    namespace: `${env}-cnpg-system`,
    secretName: `${RC_DATABASE_NAMESPACE}-app`,
});

const myApp = createRcApp(RC_APP_NAME, k8sProvider, RC_APP_NAMESPACE, RC_APP_NAME,rcAppCreds.uri);
