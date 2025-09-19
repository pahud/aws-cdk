import { App, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';

export class TestStack extends Stack {
  readonly table: dynamodb.Table;
  readonly tableTwo: dynamodb.Table;
  readonly tableWithAddedPolicy: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const doc = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          actions: ['dynamodb:*'],
          principals: [new iam.AccountRootPrincipal()],
          resources: ['*'],
        }),
      ],
    });

    this.table = new dynamodb.Table(this, 'TableTest1', {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      removalPolicy: RemovalPolicy.DESTROY,
      resourcePolicy: doc,
    });

    this.tableTwo = new dynamodb.Table(this, 'TableTest2', {
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.tableTwo.grantReadData(new iam.AccountPrincipal('123456789012'));

    // Test addToResourcePolicy functionality (the bug fix)
    this.tableWithAddedPolicy = new dynamodb.Table(this, 'TableTest3', {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.tableWithAddedPolicy.addToResourcePolicy(new iam.PolicyStatement({
      actions: ['dynamodb:GetItem'],
      principals: [new iam.ArnPrincipal('arn:aws:iam::111122223333:user/testuser')],
      resources: [this.tableWithAddedPolicy.tableArn],
    }));
  }
}

const app = new App();
const stack = new TestStack(app, 'resource-policy-stack', {});

new IntegTest(app, 'resource-policy-integ-test', {
  testCases: [stack],
});
