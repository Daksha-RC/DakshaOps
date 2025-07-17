import {createCnpgCrd} from "./stacks/cnpgcrd";
import {createDemoApps} from "./stacks/demoapps";
import {createColimaCluster} from "./stacks/colima";
import {createPgCluster} from "./stacks/pgcluster";
import {createRcApp} from "./stacks/rc-app";
import {createDebCredentials} from "./stacks/dbcredentials";
import {createRedis} from "./stacks/redis";
import {createRedisCredentials} from "./stacks/rediscredentials";
import {createEsoCrd} from "./stacks/esocrds";
import {createEscTokenSecret} from "./stacks/escTokenSecret";
// import {createKubernetesCluster} from "./stacks/dok8s";
import * as constants from "./constants";
import {CILIUM_RELEASE_NAME, DO_CLUSTER_NAME, DO_NODE_POOL_NAME, ESO_NAMESPACE, REDIS_NAME, REDIS_NAMESPACE} from "./constants";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import {createDOK8sCluster} from "./stacks/dok8s";
import {createCiliumDeployment} from "./stacks/cilium";
import {createGateway} from "./stacks/gateway";
import {createGatewayCrd} from "./stacks/gatewaycrd";


const env = pulumi.getStack();
let k8sProvider: k8s.Provider;
let kubeconfig: pulumi.Output<string>;



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
    kubeconfig = doCluster.kubeconfig;


} else {
    const colimaStart = createColimaCluster(constants.K8S_CLUSTER_NAME);
    k8sProvider = colimaStart.k8sProvider;
    kubeconfig = colimaStart.kubeconfig;

}
export { kubeconfig };

const demoApps = createDemoApps(constants.DEMOAPPS_NAME, k8sProvider);

if (env == "devc") {
    const ciliumDeployment = createCiliumDeployment(CILIUM_RELEASE_NAME, k8sProvider, [k8sProvider]);
}

const cnpgcrd = createCnpgCrd(constants.CNPG_NAMESPACE, k8sProvider, [k8sProvider]);
const esocrd = createEsoCrd(ESO_NAMESPACE, k8sProvider, [k8sProvider]);

// Note: Before running this program, you must set the ESC token in your Pulumi configuration:
// pulumi config set --secret esc:token <your-esc-token>
const escTokenSecret = createEscTokenSecret("esc-token", k8sProvider, ESO_NAMESPACE, "esctoken", [esocrd]);
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

// Create Redis instance with built-in credentials
const redis = createRedis(
    REDIS_NAME,
    k8sProvider,
    REDIS_NAMESPACE,
    REDIS_NAME
);

// Create Redis credentials that depend on the Redis instance
const redisCredentials = createRedisCredentials("dev-redis-credentials", {
    namespace: REDIS_NAMESPACE,
    secretName: `${REDIS_NAME}-credentials`,
}, {
    dependsOn: [redis],
    provider: k8sProvider
});

// You can access Redis credentials in two ways:
// 1. Directly from the Redis instance: redis.password, redis.host, redis.port, or redis.connectionString
// 2. From the Redis credentials component: redisCredentials.password

const rcApp = createRcApp(constants.RC_APP_NAME, k8sProvider, constants.RC_APP_NAMESPACE, constants.RC_APP_NAME, rcAppCreds.uri, undefined, [redis, redisCredentials]);

const pulgatewaycrd = createGatewayCrd("gaatewaycrds", k8sProvider, kubeconfig, [cnpgcrd]);

