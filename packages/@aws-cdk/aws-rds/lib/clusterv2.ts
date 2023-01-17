import * as ec2 from '@aws-cdk/aws-ec2';
import { IRole, ManagedPolicy, Role, ServicePrincipal } from '@aws-cdk/aws-iam';
import * as logs from '@aws-cdk/aws-logs';
import * as secretsmanager from '@aws-cdk/aws-secretsmanager';
import { FeatureFlags, RemovalPolicy, Token } from '@aws-cdk/core';
import * as cxapi from '@aws-cdk/cx-api';
import { Construct } from 'constructs';
import { DatabaseClusterBase, DatabaseClusterV2Props, InstanceUpdateBehaviour, IDatabaseClusterV2Instance } from './cluster';
import { IClusterEngine } from './cluster-engine';
import { IDatabaseCluster } from './cluster-ref';
import { Endpoint } from './endpoint';
import { ParameterGroup } from './parameter-group';
import { defaultDeletionProtection, renderCredentials, setupS3ImportExport, helperRemovalPolicy, renderUnless } from './private/util';
import { PerformanceInsightRetention } from './props';
import { CfnDBCluster, CfnDBInstance } from './rds.generated';
import { ISubnetGroup, SubnetGroup } from './subnet-group';


/**
 * Create a cluster with serverless v2 support
 *
 * @resource AWS::RDS::DBCluster
 */
export class DatabaseClusterV2 extends DatabaseClusterBase implements IDatabaseCluster {
  /**
   * Import an existing DatabaseCluster from properties
   */
  // public static fromDatabaseClusterAttributes(scope: Construct, id: string, attrs: DatabaseClusterAttributes): IDatabaseCluster {
  //   return new ImportedDatabaseCluster(scope, id, attrs);
  // }

  public readonly clusterIdentifier: string;
  public readonly clusterEndpoint: Endpoint;
  public readonly clusterReadEndpoint: Endpoint;
  public readonly connections: ec2.Connections;
  public readonly instanceIdentifiers: string[];
  public readonly instanceEndpoints: Endpoint[];
  public readonly engine?: IClusterEngine;
  private readonly securityGroups: ec2.ISecurityGroup[];
  private readonly subnetGroup: ISubnetGroup;
  private readonly props: DatabaseClusterV2Props;
  private readonly monitoringRole?: IRole;

  /**
   * The secret attached to this cluster
   */
  public readonly secret?: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props: DatabaseClusterV2Props) {
    super(scope, id, props);

    const credentials = renderCredentials(this, props.engine, props.credentials);
    const secret = credentials.secret;
    this.props = props;

    this.subnetGroup = props.subnetGroup ?? new SubnetGroup(this, 'Subnets', {
      description: `Subnets for ${id} database`,
      vpc: props.vpc,
      vpcSubnets: props.subnets,
      removalPolicy: renderUnless(helperRemovalPolicy(props.removalPolicy), RemovalPolicy.DESTROY),
    });

    this.securityGroups = props.securityGroups ?? [
      new ec2.SecurityGroup(this, 'SecurityGroup', {
        description: 'RDS security group',
        vpc: props.vpc,
      }),
    ];

    const combineRoles = props.engine.combineImportAndExportRoles ?? false;
    let { s3ImportRole, s3ExportRole } = setupS3ImportExport(this, props, combineRoles);

    if (props.parameterGroup && props.parameters) {
      throw new Error('You cannot specify both parameterGroup and parameters');
    }
    const parameterGroup = props.parameterGroup ?? (
      props.parameters
        ? new ParameterGroup(this, 'ParameterGroup', {
          engine: props.engine,
          parameters: props.parameters,
        })
        : undefined
    );
    // bind the engine to the Cluster
    const clusterEngineBindConfig = props.engine.bindToCluster(this, {
      s3ImportRole,
      s3ExportRole,
      parameterGroup,
    });

    const clusterAssociatedRoles: CfnDBCluster.DBClusterRoleProperty[] = [];
    if (s3ImportRole) {
      clusterAssociatedRoles.push({ roleArn: s3ImportRole.roleArn, featureName: clusterEngineBindConfig.features?.s3Import });
    }
    if (s3ExportRole &&
        // only add the second associated Role if it's different than the first
        // (duplicates in the associated Roles array are not allowed by the RDS service)
        (s3ExportRole !== s3ImportRole ||
        clusterEngineBindConfig.features?.s3Import !== clusterEngineBindConfig.features?.s3Export)) {
      clusterAssociatedRoles.push({ roleArn: s3ExportRole.roleArn, featureName: clusterEngineBindConfig.features?.s3Export });
    }

    const clusterParameterGroup = props.parameterGroup ?? clusterEngineBindConfig.parameterGroup;
    const clusterParameterGroupConfig = clusterParameterGroup?.bindToCluster({});
    this.engine = props.engine;

    const clusterIdentifier = FeatureFlags.of(this).isEnabled(cxapi.RDS_LOWERCASE_DB_IDENTIFIER) && !Token.isUnresolved(props.clusterIdentifier)
      ? props.clusterIdentifier?.toLowerCase()
      : props.clusterIdentifier;

    const cluster = new CfnDBCluster(this, 'Resource', {
      engine: props.engine.engineType,
      engineVersion: props.engine.engineVersion?.fullVersion,
      dbClusterIdentifier: clusterIdentifier,
      dbSubnetGroupName: this.subnetGroup.subnetGroupName,
      vpcSecurityGroupIds: this.securityGroups.map(sg => sg.securityGroupId),
      port: props.port ?? clusterEngineBindConfig.port,
      dbClusterParameterGroupName: clusterParameterGroupConfig?.parameterGroupName,
      associatedRoles: clusterAssociatedRoles.length > 0 ? clusterAssociatedRoles : undefined,
      deletionProtection: defaultDeletionProtection(props.deletionProtection, props.removalPolicy),
      enableIamDatabaseAuthentication: props.iamAuthentication,
      networkType: props.networkType,
      serverlessV2ScalingConfiguration: this.renderV2ScalingConfiguration(),
      // Admin
      backtrackWindow: props.backtrackWindow?.toSeconds(),
      backupRetentionPeriod: props.backup?.retention?.toDays(),
      preferredBackupWindow: props.backup?.preferredWindow,
      preferredMaintenanceWindow: props.preferredMaintenanceWindow,
      databaseName: props.defaultDatabaseName,
      enableCloudwatchLogsExports: props.cloudwatchLogsExports,
      masterUsername: credentials.username,
      masterUserPassword: credentials.password?.unsafeUnwrap(),
      // Encryption
      kmsKeyId: props.storageEncryptionKey?.keyArn,
      storageEncrypted: props.storageEncryptionKey ? true : props.storageEncrypted,
      // Tags
      copyTagsToSnapshot: props.copyTagsToSnapshot ?? true,
    });

    this.clusterIdentifier = cluster.ref;

    if (secret) {
      this.secret = secret.attach(this);
    }

    // create a number token that represents the port of the cluster
    const portAttribute = Token.asNumber(cluster.attrEndpointPort);
    this.clusterEndpoint = new Endpoint(cluster.attrEndpointAddress, portAttribute);
    this.clusterReadEndpoint = new Endpoint(cluster.attrReadEndpointAddress, portAttribute);
    this.connections = new ec2.Connections({
      securityGroups: this.securityGroups,
      defaultPort: ec2.Port.tcp(this.clusterEndpoint.port),
    });

    cluster.applyRemovalPolicy(props.removalPolicy ?? RemovalPolicy.SNAPSHOT);

    this.setLogRetention();

    if (props.monitoringInterval && props.monitoringInterval.toSeconds()) {
      this.monitoringRole = props.monitoringRole || new Role(cluster, 'MonitoringRole', {
        assumedBy: new ServicePrincipal('monitoring.rds.amazonaws.com'),
        managedPolicies: [
          ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonRDSEnhancedMonitoringRole'),
        ],
      });
    }
    const createdInstances = this.createInstances();
    this.instanceIdentifiers = createdInstances.instanceIdentifiers;
    this.instanceEndpoints = createdInstances.instanceEndpoints;
  }
  /**
   * Renders the secret attachment target specifications.
   */
  public asSecretAttachmentTarget(): secretsmanager.SecretAttachmentTargetProps {
    return {
      targetId: this.clusterIdentifier,
      targetType: secretsmanager.AttachmentTargetType.RDS_DB_CLUSTER,
    };
  }
  private renderV2ScalingConfiguration(): CfnDBCluster.ServerlessV2ScalingConfigurationProperty {
    const minCapacity = this.props.serverlessV2Scaling?.minCapacity ?? 0.5;
    const maxCapacity = this.props.serverlessV2Scaling?.maxCapacity ?? minCapacity + 0.5;

    // maxCapacity should be higher than 0.5 and we can't specify 0.5 for both minCapacity and maxCapacity so maxCapacity should be at least 1
    // @see https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.setting-capacity.html#aurora-serverless-v2.max_capacity_considerations
    if (minCapacity && minCapacity < 0.5 || maxCapacity && maxCapacity < 1) {
      throw new Error('The smallest value that you can use for minCapacity and maxCapacity is 0.5 and 1.');
    }

    if (maxCapacity && maxCapacity > 128) {
      throw new Error('The largest value that you can use for maxCapacity is 128.');
    }

    if (minCapacity && maxCapacity && minCapacity > maxCapacity) {
      throw new Error('Maximum capacity must be greater than or equal to minimum capacity.');
    }

    if (minCapacity && minCapacity % 0.5 !== 0 || maxCapacity && maxCapacity % 0.5 !== 0) {
      throw Error('You can only specify ACU values in half-step increments, such as 40, 40.5, 41, and so on.');
    }

    return {
      minCapacity,
      maxCapacity,
    };
  }
  private setLogRetention() {
    if (this.props.cloudwatchLogsExports) {
      const unsupportedLogTypes = this.props.cloudwatchLogsExports.filter(logType => !this.props.engine.supportedLogTypes.includes(logType));
      if (unsupportedLogTypes.length > 0) {
        throw new Error(`Unsupported logs for the current engine type: ${unsupportedLogTypes.join(',')}`);
      }
      if (this.props.cloudwatchLogsRetention) {
        for (const log of this.props.cloudwatchLogsExports) {
          new logs.LogRetention(this, `LogRetention${log}`, {
            logGroupName: `/aws/rds/cluster/${this.clusterIdentifier}/${log}`,
            retention: this.props.cloudwatchLogsRetention,
            role: this.props.cloudwatchLogsRetentionRole,
          });
        }
      }
    }
  }
  private addInstance(id: string, instance: IDatabaseClusterV2Instance): CfnDBInstance {
    const instanceIdentifier = this.props.instanceIdentifierBase != null ? `${this.props.instanceIdentifierBase}${id}` :
      this.props.clusterIdentifier != null ? `${this.props.clusterIdentifier}${id}` :
        undefined;
    // const instanceProps = this.props.instanceProps;
    const enablePerformanceInsights = this.props.enablePerformanceInsights;
    const instanceParameterGroup = this.props.parameterGroup ?? (
      this.props.parameters
        ? new ParameterGroup(this, 'InstanceParameterGroup', {
          engine: this.props.engine,
          parameters: this.props.parameters,
        })
        : undefined
    );
    const instanceParameterGroupConfig = instanceParameterGroup?.bindToInstance({});
    // const instanceType = this.props.instanceProps.instanceType ??
    //   ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MEDIUM);
    const cfnInstance = new CfnDBInstance(this, id, {
      // Link to cluster
      engine: this.props.engine.engineType,
      dbClusterIdentifier: this.clusterIdentifier,
      dbInstanceIdentifier: instanceIdentifier,
      // Instance properties
      dbInstanceClass: instance.serverless == true ? 'db.serverless' : `db.${instance.instanceType}`,
      publiclyAccessible: this.props.publiclyAccessible ??
          (this.props.subnets && this.props.subnets.subnetType === ec2.SubnetType.PUBLIC),
      enablePerformanceInsights: enablePerformanceInsights || this.props.enablePerformanceInsights, // fall back to undefined if not set
      performanceInsightsKmsKeyId: this.props.performanceInsightEncryptionKey?.keyArn,
      performanceInsightsRetentionPeriod: enablePerformanceInsights
        ? (this.props.performanceInsightRetention || PerformanceInsightRetention.DEFAULT)
        : undefined,
      // This is already set on the Cluster. Unclear to me whether it should be repeated or not. Better yes.
      dbSubnetGroupName: this.subnetGroup.subnetGroupName,
      dbParameterGroupName: instanceParameterGroupConfig?.parameterGroupName,
      monitoringInterval: this.props.monitoringInterval && this.props.monitoringInterval.toSeconds(),
      monitoringRoleArn: this.monitoringRole?.roleArn,
      autoMinorVersionUpgrade: this.props.autoMinorVersionUpgrade,
      allowMajorVersionUpgrade: this.props.allowMajorVersionUpgrade,
      deleteAutomatedBackups: this.props.deleteAutomatedBackups,
    });
    cfnInstance.applyRemovalPolicy(helperRemovalPolicy(this.props.removalPolicy));
    // ensure the added instance always depends on the instances created with the cluster.
    // this.node.children.forEach(e => {
    //   if (e instanceof CfnDBInstance) {
    //     instance.node.addDependency(e);
    //   }
    // });
    return cfnInstance;
  }
  // /**
  //  * Add a serverless instance into the cluster.
  //  */
  // public addServerlessInstance(id: string, instance: IDatabaseClusterV2Instance): CfnDBInstance {
  //   // Serverless v2 scaling configuration on the parent DB cluster is required before we are allowed
  //   // to create a serverless instance
  //   if (this.props.serverlessV2Scaling === undefined) {
  //     throw new Error('serverlessV2Scaling is required on the DB cluster');
  //   }
  //   return this.addInstance(id, instance);
  // }
  // /**
  //  * Add a provisioned instance into the cluster.
  //  */
  // public addProvisionedInstance(id: string, instance: IDatabaseClusterV2Instance): CfnDBInstance {
  //   return this.addInstance(id, instance);
  // }
  private createInstances() {
    const instanceUpdateBehaviour = this.props.instanceUpdateBehaviour ?? InstanceUpdateBehaviour.BULK;
    const instanceIdentifiers: string[] = [];
    const instanceEndpoints: Endpoint[] = [];
    const portAttribute = this.clusterEndpoint.port;

    // Get the actual subnet objects so we can depend on internet connectivity.
    const internetConnected = this.props.vpc.selectSubnets(this.props.subnets).internetConnectivityEstablished;
    const enablePerformanceInsights = this.props.enablePerformanceInsights
      || this.props.performanceInsightRetention !== undefined || this.props.performanceInsightEncryptionKey !== undefined;
    if (enablePerformanceInsights && this.props.enablePerformanceInsights === false) {
      throw new Error('`enablePerformanceInsights` disabled, but `performanceInsightRetention` or `performanceInsightEncryptionKey` was set');
    }
    if (this.props.parameterGroup && this.props.parameters) {
      throw new Error('You cannot specify both parameterGroup and parameters');
    }
    const instances: CfnDBInstance[] = [];

    // create the writer
    const writer = this.addInstance('writer', this.props.writer);
    instances.push(writer);
    // create the readers
    if (this.props.readers) {
      for (let i = 0; i < this.props.readers.length; i++) {
        const instanceIndex = i + 1;
        const reader = this.addInstance(`reader${instanceIndex}`, this.props.readers[i]);
        // reader should always be created after writer
        reader.node.addDependency(writer);
        instances.push(reader);
      }
    }
    // iterate the instances
    for (let i of instances) {
      //  Cluster DESTROY or SNAPSHOT -> DESTROY (snapshot is good enough to recreate)
      //  Cluster RETAIN              -> RETAIN (otherwise cluster state will disappear)
      i.applyRemovalPolicy(helperRemovalPolicy(this.props.removalPolicy));
      // We must have a dependency on the NAT gateway provider here to create
      // things in the right order.
      i.node.addDependency(internetConnected);
      instanceIdentifiers.push(i.ref);
      instanceEndpoints.push(new Endpoint(i.attrEndpointAddress, portAttribute));
    }

    // Adding dependencies here to ensure that the instances are updated one after the other.
    if (instanceUpdateBehaviour === InstanceUpdateBehaviour.ROLLING) {
      for (let i = 1; i < instances.length; i++) {
        instances[i].node.addDependency(instances[i-1]);
      }
    }
    return { instanceEndpoints, instanceIdentifiers };

  }
}
