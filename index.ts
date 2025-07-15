import {createCnpgCrd} from "./stacks/cnpgcrd";
import {createDemoApps} from "./stacks/demoapps";
import {createColimaCluster} from "./stacks/colima";
import {createPgCluster} from "./stacks/pgcluster";
import {createRcApp} from "./stacks/rc-app";
import {createDebCredentials} from "./stacks/dbcredentials";
// import {createKubernetesCluster} from "./stacks/dok8s";
import * as constants from "./constants";
import {CILIUM_RELEASE_NAME, DO_CLUSTER_NAME, DO_NODE_POOL_NAME} from "./constants";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import {createDOK8sCluster} from "./stacks/dok8s";
import {createCiliumDeployment} from "./stacks/cilium";
import {createGateway} from "./stacks/gateway";
import {createGatewayCrd} from "./stacks/gatewaycrd";


const env = pulumi.getStack();
let k8sProvider: k8s.Provider;


// The Plan
// 1 create a k8s cluster on DO or coliam
// 2 deploy httpbin
// 3 deploy gateway crds
// 4 deploy gateway crds
// 5 deploy gateway
// 6 deploy httpbin route
// 7 deploy cnpg cluster
// 8 deploy rc-app
// 8 deploy rc-app httproute
// 9 Manually install SSL certificates
// 10 get gateway IP address
// 11 Update the DNS record for the gateway IP address


if (env == "sit") {
    const doCluster = createDOK8sCluster(DO_CLUSTER_NAME, {
        clusterName: DO_CLUSTER_NAME,
        nodePoolName: DO_NODE_POOL_NAME,
        nodeSize: "s-1vcpu-2gb"
    });
    k8sProvider = doCluster.k8sProvider;

} else {
    const colimaStart = createColimaCluster(constants.K8S_CLUSTER_NAME);
    k8sProvider = colimaStart.k8sProvider;
    // const k8sCluster = colimaStart.colimaStart;
}

const demoApps = createDemoApps(constants.DEMOAPPS_NAME, k8sProvider);

if (env == "devc") {
    const ciliumDeployment = createCiliumDeployment(CILIUM_RELEASE_NAME, k8sProvider, [k8sProvider]);
}

const cnpgcrd = createCnpgCrd(constants.CNPG_NAMESPACE, k8sProvider, [k8sProvider]);
// const gatewaycrd = createGatewayCrd("gaatewaycrds", k8sProvider, [k8sProvider]);
const rcDatabase = createPgCluster(constants.RC_DATABASE_NAMESPACE, k8sProvider, constants.CNPG_NAMESPACE, constants.RC_DATABASE_NAME, [cnpgcrd]);
// TODO use safer way to get the uri from the secret

// Then create credentials that depend on the database
const rcAppCreds = createDebCredentials("rc-app-db-creds", {
    namespace: `${env}-cnpg-system`,
    secretName: `${constants.RC_DATABASE_NAMESPACE}-app`,
}, {
    dependsOn: [rcDatabase],
    provider: k8sProvider  // Make sure to use the same provider
});


const myApp = createRcApp(constants.RC_APP_NAME, k8sProvider, constants.RC_APP_NAMESPACE, constants.RC_APP_NAME, rcAppCreds.uri);


