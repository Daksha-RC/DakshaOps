import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

interface ServiceNetworkingArgs {
    projectId: pulumi.Input<string>;
    networkName?: string; // defaults to "default"
}

export class ServiceNetworkingSetup extends pulumi.ComponentResource {
    public readonly peeringConnection: gcp.servicenetworking.Connection;

    constructor(name: string, args: ServiceNetworkingArgs, opts?: pulumi.ComponentResourceOptions) {
        super("custom:infra:ServiceNetworkingSetup", name, {}, opts);

        const networkName = args.networkName ?? "default";

        // Step 0: Enable Service Networking API
        const enableApi = new gcp.projects.Service(`${name}-api`, {
            project: args.projectId,
            service: "servicenetworking.googleapis.com"
        }, { parent: this, protect: true, retainOnDelete: true });

        // Step 1: Reserve IP range for peering
        const reservedRange = new gcp.compute.GlobalAddress(`${name}-range`, {
            purpose: "VPC_PEERING",
            addressType: "INTERNAL",
            prefixLength: 16,
            network: pulumi.interpolate`projects/${args.projectId}/global/networks/${networkName}`,
        }, { parent: this, protect: true });

        // Step 2: Create VPC Peering, after API is enabled
        this.peeringConnection = new gcp.servicenetworking.Connection(`${name}-peering`, {
            network: pulumi.interpolate`projects/${args.projectId}/global/networks/${networkName}`,
            service: "servicenetworking.googleapis.com",
            reservedPeeringRanges: [reservedRange.name],
        }, {
            parent: this,
            dependsOn: [enableApi], // Ensure API is enabled before peering
            protect: true
        });

        this.registerOutputs({ peeringConnection: this.peeringConnection });
    }
}

// 🏭 Factory Function
export function createDefaultNetworkPeering(projectId: pulumi.Input<string>): ServiceNetworkingSetup {
    return new ServiceNetworkingSetup("default-network-peering", { projectId });
}
