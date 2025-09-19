import { App, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import { IntegTest } from '@aws-cdk/integ-tests-alpha';

const app = new App({
  postCliContext: {
    '@aws-cdk/aws-dynamodb:resourcePolicyPerReplica': false,
  },
});

class TestStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Table with resource policy demonstrating security best practices
    const tableWithInitialPolicy = new dynamodb.TableV2(this, 'TableTestV2-1', {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.STRING,
      },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Create a scoped resource policy following the principle of least privilege:
    // - Use specific actions instead of 'dynamodb:*'
    // - Use specific table pattern instead of '*' for resources
    // - This demonstrates proper scoping without circular dependencies
    const docu = new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          actions: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem'],
          principals: [new iam.AccountRootPrincipal()],
          resources: ['arn:aws:dynamodb:*:*:table/TableTestV2-1*'], // Scoped to tables with this prefix
        }),
      ],
    });

    // Apply the policy to the table
    tableWithInitialPolicy.resourcePolicy = docu;

    // Test addToResourcePolicy functionality - demonstrates adding policies after table creation
    const tableWithAddedPolicy = new dynamodb.TableV2(this, 'TableTestV2-2', {
      partitionKey: {
        name: 'pk',
        type: dynamodb.AttributeType.STRING,
      },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Add a resource policy statement after table creation using addToResourcePolicy()
    // This method allows incremental policy building and demonstrates proper scoping:
    // - Specific action (PutItem only)
    // - Specific principal (individual IAM user)
    // - Scoped resource pattern (avoids circular dependencies)
    tableWithAddedPolicy.addToResourcePolicy(new iam.PolicyStatement({
      actions: ['dynamodb:PutItem'],
      principals: [new iam.ArnPrincipal('arn:aws:iam::111122223333:user/testuser')],
      resources: ['arn:aws:dynamodb:*:*:table/TableTestV2-2*'], // Scoped to tables with this prefix
    }));
  }
}

const stack = new TestStack(app, 'ResourcePolicyTest-v2', { env: { region: 'eu-west-1' } });

new IntegTest(app, 'table-v2-resource-policy-integ-test', {
  testCases: [stack],
});

// Assert that resource policies are properly configured in the synthesized template
const template = Template.fromStack(stack);

// Verify we have exactly 2 DynamoDB GlobalTable resources (one for each table)
template.resourceCountIs('AWS::DynamoDB::GlobalTable', 2);

// Verify that both tables have resource policies with proper security scoping
template.allResourcesProperties('AWS::DynamoDB::GlobalTable', {
  Replicas: Match.arrayWith([
    Match.objectLike({
      ResourcePolicy: Match.objectLike({
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Resource: Match.not('*'), // No bare wildcards allowed
              Action: Match.not('dynamodb:*'), // No wildcard actions allowed
            }),
          ]),
        }),
      }),
    }),
  ]),
});

// Verify that at least one table has the expected scoped resource pattern
template.hasResourceProperties('AWS::DynamoDB::GlobalTable', {
  Replicas: Match.arrayWith([
    Match.objectLike({
      ResourcePolicy: Match.objectLike({
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Resource: Match.stringLikeRegexp('arn:aws:dynamodb:\\*:\\*:table/TableTestV2-.*\\*'),
            }),
          ]),
        }),
      }),
    }),
  ]),
});
