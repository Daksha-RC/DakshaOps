import {KindCluster} from "./stacks/kind";
import {CiliumDeployment} from "./stacks/cilium";
import {NginxDeployment} from "./stacks/nginx";
import {createCnpgCrd} from "./stacks/cnpgcrd";
import * as pulumi from "@pulumi/pulumi";

const env = pulumi.getStack();
const CNPG_NAMESPACE = `${env}-cnpg-system`;
const CILIUM_RELEASE_NAME = `${env}-cilium`;
const NGINX_DEPLOYMENT_NAME = `${env}-nginx`;



// Create Kind cluster and get the Kubernetes provider
const kindClusterComponent = new KindCluster("dev-cluster");
const k8sProvider = kindClusterComponent.k8sProvider;
const kindCluster = kindClusterComponent.kindCluster;

// Deploy Cilium on the cluster
const ciliumDeployment = new CiliumDeployment(CILIUM_RELEASE_NAME, {
    k8sProvider: k8sProvider,
    dependsOn: [kindCluster]
});

// Deploy NGINX using the component resource
const nginxDeployment = new NginxDeployment(NGINX_DEPLOYMENT_NAME, {
    k8sProvider: k8sProvider,
    dependsOn: [ciliumDeployment.ciliumReady, ciliumDeployment.hubbleUIReady]
});

const cnpg = createCnpgCrd(CNPG_NAMESPACE, k8sProvider,[nginxDeployment]);