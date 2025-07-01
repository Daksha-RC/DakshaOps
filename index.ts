import * as pulumi from "@pulumi/pulumi";
import * as command from "@pulumi/command";
import * as k8s from "@pulumi/kubernetes";
import { KindCluster } from "./stacks/kind";
import { CiliumDeployment } from "./stacks/cilium";
import { NginxDeployment } from "./stacks/nginx";





// Create Kind cluster and get the Kubernetes provider
const kindClusterComponent = new KindCluster("dev-cluster");
const k8sProvider = kindClusterComponent.k8sProvider;
const kindCluster = kindClusterComponent.kindCluster;

// Deploy Cilium on the cluster
const ciliumDeployment = new CiliumDeployment("cilium-deployment", {
    k8sProvider: k8sProvider,
    dependsOn: [kindCluster]
});

// Deploy NGINX using the component resource
const nginxDeployment = new NginxDeployment("nginx-deployment", {
    k8sProvider: k8sProvider,
    dependsOn: [ciliumDeployment.ciliumReady, ciliumDeployment.hubbleUIReady]
});