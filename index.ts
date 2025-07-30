import * as pulumi from "@pulumi/pulumi";
import {createCloudSql} from "./stacks/cloudsql";
import {CLOUD_SQL_NAME} from "./constants";
import {createDefaultNetworkPeering} from "./stacks/networkpeering";
import * as gcp from "@pulumi/gcp";

// Get the configuration object for the 'db' namespace.
const config = new pulumi.Config("db");

// Retrieve database configuration from Pulumi config.
const dbName = config.require("databaseName");
const userName = config.require("databaseUserName");
const dbPassword = config.requireSecret("pgPassword");
// const networkPeer = createDefaultNetworkPeering(gcp.config.project);
const networkPeer = createDefaultNetworkPeering(gcp.config.project ?? "default-project-id");
// Create a new Cloud SQL instance using the factory function.
const sqlInstance = createCloudSql(CLOUD_SQL_NAME, {
    dbName: dbName,
    userName: userName,
    password: dbPassword,
}, {
    dependsOn: [networkPeer],
});

// Export the instance connection name to be used by applications.
export const instanceConnectionName = sqlInstance.connectionName;
export const databaseName = sqlInstance.databaseName;
export const databaseUserName = sqlInstance.userName;
