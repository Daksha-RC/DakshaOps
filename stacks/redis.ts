import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as random from "@pulumi/random";
import { REDIS_NAME, REDIS_NAMESPACE } from "../constants";

export interface RedisArgs {
  k8sProvider: k8s.Provider;
  namespace: string;
  releaseName: string;
  values?: Record<string, any>;
  dependsOn?: pulumi.Resource[];
}

/**
 * Redis is a ComponentResource that manages a Redis instance using the Bitnami Helm chart.
 */
export class Redis extends pulumi.ComponentResource {
  public readonly release: k8s.helm.v3.Release;
  public readonly secretName: pulumi.Output<string>;
  public readonly namespace: pulumi.Output<string>;
  public readonly password: pulumi.Output<string>;
  public readonly host: pulumi.Output<string>;
  public readonly port: pulumi.Output<string>;
  public readonly connectionString: pulumi.Output<string>;

  constructor(
    name: string,
    args: RedisArgs,
    opts?: pulumi.ComponentResourceOptions,
  ) {
    super("dakshaOps:app:Redis", name, {}, opts);

    // Ensure the namespace exists
    const ns = new k8s.core.v1.Namespace(
      args.namespace,
      {
        metadata: { name: args.namespace },
      },
      { parent: this, provider: args.k8sProvider, dependsOn: args.dependsOn },
    );

    // Generate a random password for Redis
    const redisPassword = new random.RandomPassword(`${name}-password`, {
      length: 16,
      special: false,
    }, { parent: this });

    // Create a Kubernetes Secret with the Redis password
    const redisSecret = new k8s.core.v1.Secret(`${name}-secret`, {
      metadata: {
        name: `${args.releaseName}-credentials`,
        namespace: args.namespace,
      },
      type: "Opaque",
      stringData: {
        // Store the password in the secret
        "redis-password": redisPassword.result,
      },
    }, { 
      parent: this, 
      provider: args.k8sProvider,
      dependsOn: [ns, ...(args.dependsOn || [])]
    });

    // Store the secret name and namespace for later use
    this.secretName = redisSecret.metadata.name;
    this.namespace = pulumi.output(args.namespace);
    
    // Extract the password directly from the random password generator
    this.password = pulumi.secret(redisPassword.result);
    
    // Set the default Redis port
    this.port = pulumi.output("6379");
    
    // Construct the host using the release name and namespace
    // For Bitnami Redis, the host follows the pattern: <release-name>-master.<namespace>.svc.cluster.local
    this.host = pulumi.interpolate`${args.releaseName}-master.${args.namespace}.svc.cluster.local`;
    
    // Construct the Redis connection string
    this.connectionString = pulumi.interpolate`redis://:${this.password}@${this.host}:${this.port}`;

    // Install the Redis Helm chart
    this.release = new k8s.helm.v3.Release(
      args.releaseName,
      {
        chart: "redis",
        namespace: args.namespace,
        repositoryOpts: {
          repo: "https://charts.bitnami.com/bitnami",
        },
        createNamespace: false,
        values: args.values || {
          // Minimal configuration with minimal persistence
          architecture: "standalone",
          auth: {
            enabled: true,
            // Use the created secret for authentication
            existingSecret: redisSecret.metadata.name,
            existingSecretPasswordKey: "redis-password",
          },
          master: {
            persistence: {
              enabled: true,
              size: "1Gi", // Minimal persistence size
            },
            resources: {
              requests: {
                memory: "128Mi",
                cpu: "100m",
              },
              limits: {
                memory: "256Mi",
                cpu: "250m",
              },
            },
          },
          replica: {
            // No replicas for minimal setup
            replicaCount: 0,
          },
        },
        version: "21.2.12", // Latest chart version as of 2025-07-16
        atomic: false,
      },
      {
        parent: this,
        provider: args.k8sProvider,
        dependsOn: [ns, redisSecret, ...(args.dependsOn || [])],
      },
    );

    this.registerOutputs({
      release: this.release,
      secretName: this.secretName,
      namespace: this.namespace,
      password: this.password,
      host: this.host,
      port: this.port,
      connectionString: this.connectionString,
    });
  }
}

/**
 * Factory function to create a Redis instance.
 * @param name Resource name
 * @param k8sProvider Kubernetes provider
 * @param namespace Namespace to deploy Redis in
 * @param releaseName Name of the Helm release
 * @param values Optional custom values for the Helm chart
 * @param dependsOn Optional resources this depends on
 * @returns Redis instance with the following properties:
 *   - release: The Helm release for Redis
 *   - secretName: The name of the Kubernetes Secret containing Redis credentials
 *   - namespace: The namespace where Redis is deployed
 *   - password: The Redis password (as a Pulumi secret)
 *   - host: The Redis host address
 *   - port: The Redis port
 *   - connectionString: The complete Redis connection string (redis://:password@host:port)
 */
export function createRedis(
  name: string,
  k8sProvider: k8s.Provider,
  namespace: string,
  releaseName: string,
  values?: Record<string, any>,
  dependsOn?: pulumi.Resource[],
): Redis {
  return new Redis(name, {
    k8sProvider,
    namespace,
    releaseName,
    values,
    dependsOn,
  });
}
