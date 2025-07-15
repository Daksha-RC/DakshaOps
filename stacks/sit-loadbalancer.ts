import * as pulumi from "@pulumi/pulumi";
import * as digitalocean from "@pulumi/digitalocean";

const a724c522953744c6f86f970967794a08 = new digitalocean.LoadBalancer("a724c522953744c6f86f970967794a08", {
    dropletIds: [504136223],
    forwardingRules: [
        {
            entryPort: 443,
            entryProtocol: "tcp",
            targetPort: 443,
            targetProtocol: "tcp",
        },
        {
            entryPort: 80,
            entryProtocol: "tcp",
            targetPort: 80,
            targetProtocol: "tcp",
        },
    ],
    healthcheck: {
        checkIntervalSeconds: 3,
        path: "/healthz",
        port: 32394,
        protocol: "http",
    },
    httpIdleTimeoutSeconds: 60,
    name: "a724c522953744c6f86f970967794a08",
    region: digitalocean.Region.BLR1,
    sizeUnit: 1,
    type: "REGIONAL_NETWORK",
    vpcUuid: "441b360e-8036-4bed-b4b5-1cb1df04609a",
}, {
    protect: true,
});
