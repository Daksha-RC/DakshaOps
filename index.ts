import * as pulumi from "@pulumi/pulumi";
import * as command from "@pulumi/command";
import * as k8s from "@pulumi/kubernetes";
import * as fs from "fs";

// 1. Create Kind cluster (idempotent)
const kindCluster = new command.local.Command("create-kind-cluster", {
    create: "kind create cluster --name dev --config kind-install/kind-config-dev.yaml || true",
    delete: "kind delete cluster --name dev",
});

// 2. Get kubeconfig (after cluster is created)
const kubeconfig = kindCluster.stdout.apply(_ => {
    // Kind stores kubeconfig in the default location
    return fs.readFileSync(`${process.env.HOME}/.kube/config`, "utf8");
});

// 3. Create Kubernetes provider using Kind's kubeconfig
const k8sProvider = new k8s.Provider("kind-provider", {
    kubeconfig: kubeconfig,
});

// 4. Install Cilium using Helm chart
const ciliumRelease = new k8s.helm.v3.Release("cilium", {
    chart: "cilium",
    version: "1.17.4",
    repositoryOpts: {
        repo: "https://helm.cilium.io/",
    },
    namespace: "kube-system",
    values: {
        // Cilium configuration for Kind
        kubeProxyReplacement: false,

        // Operator configuration (disabled to match remote)
        operator: {
            enabled: false,
        },

        // Envoy configuration (disabled - using embedded mode)
        envoy: {
            enabled: false,
        },

        // Hubble configuration (enabled with relay and UI)
        hubble: {
            enabled: true,
            relay: {
                enabled: true,
            },
            ui: {
                enabled: true,
                replicas: 1,
            },
        },

        // ClusterMesh configuration (disabled)
        clustermesh: {
            useAPIServer: false,
        },

        // Other configurations
        hostServices: {
            enabled: false,
        },
        externalIPs: {
            enabled: true,
        },
        nodePort: {
            enabled: true,
        },
        hostPort: {
            enabled: true,
        },
        image: {
            pullPolicy: "IfNotPresent",
        },
        ipam: {
            mode: "kubernetes",
        },
    },
}, {
    provider: k8sProvider,
    dependsOn: [kindCluster]
});

// 5. Wait for Cilium to be ready
const ciliumReady = new command.local.Command("wait-for-cilium", {
    create: "kubectl --context kind-dev wait --for=condition=ready pod -l k8s-app=cilium -n kube-system --timeout=300s",
}, {
    dependsOn: [ciliumRelease]
});

// 6. Wait for Hubble UI to be ready
const hubbleUIReady = new command.local.Command("wait-for-hubble-ui", {
    create: "kubectl --context kind-dev wait --for=condition=ready pod -l k8s-app=hubble-ui -n kube-system --timeout=300s",
}, {
    dependsOn: [ciliumRelease]
});

// 7. Deploy NGINX using the provider (after Cilium and Hubble UI are ready)
const appLabels = { app: "nginx" };
const deployment = new k8s.apps.v1.Deployment("nginx", {
    metadata: { labels: appLabels },
    spec: {
        selector: { matchLabels: appLabels },
        replicas: 1,
        template: {
            metadata: { labels: appLabels },
            spec: {
                containers: [{
                    name: "nginx",
                    image: "nginx:latest",
                    ports: [{ containerPort: 80 }],
                }],
            },
        },
    },
}, {
    provider: k8sProvider,
    dependsOn: [ciliumReady, hubbleUIReady]
});