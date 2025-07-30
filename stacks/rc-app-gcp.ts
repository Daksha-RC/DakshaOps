import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

export interface RcAppGcpArgs {
    project?: pulumi.Input<string>;
    location: pulumi.Input<string>;
    databaseUrl: pulumi.Input<string>; // Should be a secret
    clientOriginUrl: pulumi.Input<string>;
    cloudsqlInstances: pulumi.Input<string>[];
    dependsOn?: pulumi.Resource[];
}

export class RcAppGcp extends pulumi.ComponentResource {
    public readonly service: gcp.cloudrun.Service;
    public readonly url: pulumi.Output<string>;

    constructor(name: string, args: RcAppGcpArgs, opts?: pulumi.ComponentResourceOptions) {
        super("dakshaOps:component:RcAppGcp", name, {}, opts);

        const project = args.project ?? gcp.config.project;

        this.service = new gcp.cloudrun.Service(name, {
            project: project,
            location: args.location,
            template: {
                metadata: {
                    annotations: {
                        "run.googleapis.com/cloudsql-instances": pulumi.all(args.cloudsqlInstances).apply(i => i.join(",")),
                    },
                },
                spec: {
                    containers: [{
                        image: "asia-south2-docker.pkg.dev/daksha-rcgm/dcr/daksha-rc/rc-web:rc-web-v2.4.0-amd64",
                        // image: "ghcr.io/daksha-rc/rc-web:rc-web-v2.4.0-amd64",
                        ports: [{ containerPort: 8000 }],
                        envs: [
                            {
                                name: "DATABASE_URL",
                                value: args.databaseUrl,
                            },
                            {
                                name: "CLIENT_ORIGIN_URL",
                                value: args.clientOriginUrl,
                            },
                        ],
                    }],
                },
            },
        }, { parent: this, dependsOn: args.dependsOn });

        // Allow unauthenticated invocations
        const iamMember = new gcp.cloudrun.IamMember(`${name}-iam`, {
            project: this.service.project,
            location: this.service.location,
            service: this.service.name,
            role: "roles/run.invoker",
            member: "allUsers",
        }, { parent: this });

        this.url = this.service.statuses[0].url;

        this.registerOutputs({
            service: this.service,
            url: this.url,
        });
    }
}

/**
 * Factory function to create a minimal Cloud Run service for the RC App.
 */
export function createRcAppGcp(name: string, args: RcAppGcpArgs, opts?: pulumi.ComponentResourceOptions): RcAppGcp {
    return new RcAppGcp(name, args, opts);
}
