import {createCnpgCrd} from "./stacks/cnpgcrd";
import {createColimaCluster} from "./stacks/colima";
import {createRcApp} from "./stacks/rc-app";
import {createEsoCrd} from "./stacks/esocrds";
import {createEscTokenSecret} from "./stacks/escTokenSecret";
import {createClusterSecretStore} from "./stacks/ClusterSecretStore";
// import {createKubernetesCluster} from "./stacks/dok8s";
import * as constants from "./constants";
import {
    CILIUM_RELEASE_NAME,
    CNPG_SECRET,
    CNPG_SECRET_APP,
    CNPG_SECRET_DB,
    DO_CLUSTER_NAME,
    DO_NODE_POOL_NAME,
    ESO_NAMESPACE,
    PULUMI_ORGANIZATION,
    RC_APP_NAMESPACE,
    RC_PG_NAMESPACE,
    REDIS_NAMESPACE
} from "./constants";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import {createDOK8sCluster} from "./stacks/dok8s";
import {createCiliumDeployment} from "./stacks/cilium";
import {createGatewayCrd} from "./stacks/gatewaycrd";
import {createCnpgSecret} from "./stacks/cnpgSecret";
import {createPgCluster} from "./stacks/pgcluster";


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
export {kubeconfig};

// const demoApps = createDemoApps(constants.DEMOAPPS_NAME, k8sProvider);

if (env == "devc") {
    const ciliumDeployment = createCiliumDeployment(CILIUM_RELEASE_NAME, k8sProvider, [k8sProvider]);
}
// Start creating all namespaces needed

const eso_ns = new k8s.core.v1.Namespace(ESO_NAMESPACE, {
    metadata: {name: ESO_NAMESPACE},
}, {provider: k8sProvider, dependsOn: k8sProvider});

const redis_ns = new k8s.core.v1.Namespace(REDIS_NAMESPACE, {
    metadata: {name: REDIS_NAMESPACE},
}, {provider: k8sProvider, dependsOn: k8sProvider});

const rc_pg_ns = new k8s.core.v1.Namespace(RC_PG_NAMESPACE, {
    metadata: {name: RC_PG_NAMESPACE},
}, {provider: k8sProvider, dependsOn: k8sProvider});


const rc_app_ns = new k8s.core.v1.Namespace(RC_APP_NAMESPACE, {
    metadata: {name: RC_APP_NAMESPACE},
}, {provider: k8sProvider, dependsOn: k8sProvider});


// end of creating namespaces

// start of creating crds

const esocrd = createEsoCrd(ESO_NAMESPACE, k8sProvider, [k8sProvider, eso_ns]);
const cnpgcrd = createCnpgCrd(constants.RC_PG_NAMESPACE, k8sProvider, [k8sProvider, rc_pg_ns]);
const gatewayCrd = createGatewayCrd("gatewayCrd", k8sProvider, kubeconfig, [cnpgcrd]);


// Note: Before running this program, you must set the ESC token in your Pulumi configuration:
// pulumi config set --secret esc:token <your-esc-token>
const escTokenSecret = createEscTokenSecret("esc-token", k8sProvider, ESO_NAMESPACE, "esctoken", [esocrd, eso_ns]);

// Create a ClusterSecretStore that connects to Pulumi ESC using the token
const clusterSecretStore = createClusterSecretStore(
    constants.CNPG_SECRET_STORE,
    k8sProvider,
    ESO_NAMESPACE,
    escTokenSecret,
    undefined,
    PULUMI_ORGANIZATION,
    esocrd.release,  // Pass the ESO CRD Helm release as a dependency
    "dev-daksha-cluster", // Pulumi environment
    "Daksha", // Pulumi project
    undefined, // <-- apiUrl, use undefined for default or provide a string
    [escTokenSecret, eso_ns] // dependsOn
);

// Create an ExternalSecret that fetches the db.cnpgPassword from Pulumi ESC
const cnpgSecret = createCnpgSecret(
    CNPG_SECRET_DB,
    k8sProvider,
    RC_PG_NAMESPACE,  // Use the same namespace as RC_APP_NAMESPACE
    clusterSecretStore,
    CNPG_SECRET,
    [clusterSecretStore.secretStore, rc_pg_ns]  // Depend on the ClusterSecretStore
);
const cnpgSecretforApp = createCnpgSecret(
    CNPG_SECRET_APP,
    k8sProvider,
    RC_APP_NAMESPACE,  // Use the same namespace as RC_APP_NAMESPACE
    clusterSecretStore,
    CNPG_SECRET,
    [clusterSecretStore.secretStore, rc_app_ns]  // Depend on the ClusterSecretStore
);


const rcDatabase = createPgCluster(RC_PG_NAMESPACE, k8sProvider, RC_PG_NAMESPACE, constants.RC_DATABASE_NAME,
    cnpgSecretforApp.secretName, [cnpgcrd,cnpgSecret,rc_pg_ns,eso_ns, redis_ns, rc_pg_ns, esocrd, gatewayCrd, cnpgSecret]);


// Create Redis instance with built-in credentials
// const redis = createRedis(
//     REDIS_NAME,
//     k8sProvider,
//     REDIS_NAMESPACE,
//     REDIS_NAME
// );

// Create Redis credentials that depend on the Redis instance
// const redisCredentials = createRedisCredentials("dev-redis-credentials", {
//     namespace: REDIS_NAMESPACE,
//     secretName: `${REDIS_NAME}-credentials`,
// }, {
//     dependsOn: [redis],
//     provider: k8sProvider
// });

// You can access Redis credentials in two ways:
// 1. Directly from the Redis instance: redis.password, redis.host, redis.port, or redis.connectionString
// 2. From the Redis credentials component: redisCredentials.password
//
const rcApp = createRcApp(constants.RC_APP_NAME, k8sProvider, constants.RC_APP_NAMESPACE,
    constants.RC_APP_NAME, CNPG_SECRET_APP, undefined,
    [eso_ns, redis_ns, rc_pg_ns, esocrd, gatewayCrd, cnpgSecretforApp,cnpgSecret,rcDatabase]);



