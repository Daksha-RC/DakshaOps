import {createCnpgCrd} from "./stacks/cnpgcrd";
import {createColimaCluster} from "./stacks/colima";
import {createRcApp} from "./stacks/rc-app";
import {createEsoCrd} from "./stacks/esocrds";
import {createEscTokenSecret} from "./stacks/escTokenSecret";
import {createClusterSecretStore} from "./stacks/ClusterSecretStore";
import * as digitalocean from "@pulumi/digitalocean";
// import {createKubernetesCluster} from "./stacks/dok8s";
import * as constants from "./constants";
import {
    CILIUM_RELEASE_NAME,
    CNPG_SECRET,
    CNPG_SECRET_APP,
    CNPG_SECRET_DB,
    DO_CLUSTER_NAME,
    DO_NODE_POOL_NAME,
    ESC_ENV,
    ESO_NAMESPACE,
    PULUMI_ORGANIZATION,
    RC_APP_NAMESPACE,
    RC_PG_CLUSTER_NAME,
    RC_PG_NAMESPACE,
    REDIS_NAMESPACE
} from "./constants";
import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import {createDOK8sCluster} from "./stacks/dok8s";
import {createCiliumDeployment} from "./stacks/cilium";
import {createCnpgSecret} from "./stacks/cnpgSecret";
import {createPgCluster} from "./stacks/pgcluster";


const env = pulumi.getStack();
const config = new pulumi.Config();
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


if (env == "dsit") {
    // Node pool parameters directly from your doctl command
    const nodePoolName = DO_NODE_POOL_NAME;
    const nodePoolSize = "s-1vcpu-2gb";
    const nodePoolCount = 1;
    const nodePoolAutoScale = false; // Based on auto-scale=false
    const nodePoolTags = ["k8s", "k8s:worker", "terraform:default-node-pool", "created-by:pulumi"];

    const k8sVersion = config.get("kubernetesVersion") || "1.33.1-do.2";
    const vpcUuid = config.get("vpcUuid") || "441b360e-8036-4bed-b4b5-1cb1df04609a";
    const clusterSubnet = config.get("clusterSubnet") || "10.110.0.0/16";
    const serviceSubnet = config.get("serviceSubnet") || "10.111.0.0/22";

    const doCluster = createDOK8sCluster(DO_CLUSTER_NAME, {
        clusterName: DO_CLUSTER_NAME,
        version: k8sVersion,
        vpcUuid: vpcUuid,
        clusterSubnet: clusterSubnet,
        serviceSubnet: serviceSubnet,
        nodePool: {
            name: nodePoolName,
            size: nodePoolSize,
            count: nodePoolCount,
            autoScale: nodePoolAutoScale,
            // minNodes and maxNodes are only relevant if autoScale is true.
            // Since autoScale is false, we can omit them or set them to 0 if the interface requires it,
            // but typically the provider ignores them if autoScale is false.
            tags: nodePoolTags,
        },
    });
    k8sProvider = doCluster.k8sProvider;
    kubeconfig = doCluster.kubeconfig;


} else if (env == "sit") {

    const fit_daksha_cluster = new digitalocean.KubernetesCluster("fit-daksha-cluster", {
        clusterSubnet: "10.120.0.0/16",
        maintenancePolicy: {
            day: "any",
            startTime: "00:00",
        },
        name: "fit-daksha-cluster",
        nodePool: {
            name: "sit-initial-pool",
            size: "s-1vcpu-2gb",
        },
        region: digitalocean.Region.BLR1,
        routingAgent: {
            enabled: false,
        },
        serviceSubnet: "10.121.0.0/22",
        version: "1.33.1-do.2",
        vpcUuid: "441b360e-8036-4bed-b4b5-1cb1df04609a",
    }, {
        protect: true,
    });
    kubeconfig = fit_daksha_cluster.kubeConfigs.apply(kubeConfigs => kubeConfigs[0].rawConfig);
    k8sProvider = new k8s.Provider("do-k8s-provider", {
        kubeconfig: kubeconfig,
    }, {
        dependsOn: [fit_daksha_cluster]
    });
    // kubeconfig = fit_daksha_cluster.kubeConfig
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
const cnpgcrd = createCnpgCrd(constants.RC_PG_NAMESPACE, kubeconfig, [k8sProvider, rc_pg_ns]);
// const gatewayCrd = createGatewayCrd("gatewayCrd", k8sProvider, kubeconfig);


// Note: Before running this program, you must set the ESC token in your Pulumi configuration:
// pulumi config set --secret esc:token <your-esc-token>
const escTokenSecret = createEscTokenSecret("esc-token", k8sProvider, ESO_NAMESPACE, "esctoken", [k8sProvider, esocrd, eso_ns]);

// Create a ClusterSecretStore that connects to Pulumi ESC using the token
const clusterSecretStore = createClusterSecretStore(
    constants.CNPG_SECRET_STORE,
    k8sProvider,
    ESO_NAMESPACE,
    escTokenSecret,
    undefined,
    PULUMI_ORGANIZATION,
    undefined,  // Pass the ESO CRD Helm release as a dependency
    ESC_ENV, // Pulumi environment
    "Daksha", // Pulumi project
    undefined, // <-- apiUrl, use undefined for default or provide a string
    [escTokenSecret, eso_ns, k8sProvider, cnpgcrd] // dependsOn
);

// Create an ExternalSecret that fetches the db.cnpgPassword from Pulumi ESC
const cnpgSecret = createCnpgSecret(
    CNPG_SECRET_DB,
    k8sProvider,
    RC_PG_NAMESPACE,  // Use the same namespace as RC_APP_NAMESPACE
    clusterSecretStore,
    CNPG_SECRET,
    [clusterSecretStore.secretStore, rc_pg_ns, k8sProvider, cnpgcrd]  // Depend on the ClusterSecretStore
);
const cnpgSecretforApp = createCnpgSecret(
    CNPG_SECRET_APP,
    k8sProvider,
    RC_APP_NAMESPACE,  // Use the same namespace as RC_APP_NAMESPACE
    clusterSecretStore,
    CNPG_SECRET,
    [clusterSecretStore.secretStore, rc_app_ns, k8sProvider, cnpgcrd]  // Depend on the ClusterSecretStore
);


const rcDatabase = createPgCluster(RC_PG_CLUSTER_NAME, k8sProvider, RC_PG_NAMESPACE, constants.RC_DATABASE_NAME,
    CNPG_SECRET_DB, [cnpgcrd, cnpgSecret, rc_pg_ns, eso_ns, redis_ns, rc_pg_ns, esocrd, cnpgSecret, k8sProvider]);


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
    [eso_ns, redis_ns, rc_pg_ns, esocrd, cnpgSecretforApp, cnpgSecret, rcDatabase, k8sProvider,cnpgcrd]);



