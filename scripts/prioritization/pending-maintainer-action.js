/**
 * Monitors open `beginning-contributor` PRs and flags the ones that need maintainer
 * action by moving them to the "Needs Attention" status on a GitHub Project (v2) board.
 *
 * A PR needs attention when either:
 *   - CI is pending approval (a workflow run for the PR's head commit has
 *     conclusion `action_required`), or
 *   - CI was approved (or skipped approval) but never reported a result back
 *     (no workflow runs and no commit statuses for the head commit, or a
 *     completed build run with no commit status).
 *
 * Both cases are placed into the same "Needs Attention" status option — this
 * script intentionally does not distinguish between the two on the board.
 *
 * This is a self-contained script (no shared config/helpers) so it can be tested
 * independently against a personal project board before deciding whether to fold
 * it into the shared `scripts/prioritization/` automation.
 */

const CONFIG = {
  owner: 'aws',
  repo: 'aws-cdk',
  label: 'beginning-contributor',
  // Stable identifiers (workflow file paths) for the PR build workflows, since the
  // display `name:` field can be renamed at any time.
  buildWorkflowPaths: [
    '.github/workflows/pr-build.yml',
    '.github/workflows/codebuild-pr-build.yml',
  ],
  project: {
    // Personal project board under github.com/users/pahud/projects/2 — used for
    // testing only. Not the real aws/aws-cdk org board (project #263).
    ownerLogin: 'pahud',
    ownerType: 'user', // 'user' | 'organization'
    projectId: 'PVT_kwHOAAQ_oM4Bc87n',
    statusFieldId: 'PVTSSF_lAHOAAQ_oM4Bc87nzhXiAvw',
    needsAttentionOptionId: '45f0f904',
  },
};

/**
 * Fetches all open, non-draft PRs with the configured label.
 */
async function fetchLabeledOpenPrs({ github, owner, repo, label }) {
  const prs = await github.paginate(github.rest.issues.listForRepo, {
    owner,
    repo,
    state: 'open',
    labels: label,
    per_page: 100,
  });
  // issues.listForRepo also returns plain issues; keep PRs only.
  return prs.filter((item) => item.pull_request);
}

/**
 * Determines whether a PR needs maintainer attention (pending approval or
 * pending build result), based on its head commit's workflow runs and combined
 * commit status.
 */
async function needsAttention({ github, owner, repo, pr }) {
  const { data: workflowRuns } = await github.rest.actions.listWorkflowRunsForRepo({
    owner,
    repo,
    head_sha: pr.head.sha,
    per_page: 20,
  });
  const runs = workflowRuns.workflow_runs;

  const hasActionRequired = runs.some((run) => run.conclusion === 'action_required');
  if (hasActionRequired) {
    return { needsAttention: true, reason: 'pending_approval' };
  }

  const buildRun = runs.find((run) => CONFIG.buildWorkflowPaths.includes(run.path));

  if (buildRun && (buildRun.status === 'queued' || buildRun.status === 'in_progress')) {
    return { needsAttention: false, reason: 'build_in_progress' };
  }

  const { data: status } = await github.rest.repos.getCombinedStatusForRef({
    owner,
    repo,
    ref: pr.head.sha,
  });
  const noCommitStatuses = status.state === 'pending' && status.total_count === 0;

  if (noCommitStatuses && runs.length === 0) {
    // No workflow runs at all and no commit statuses — approval was skipped
    // (or never triggered) and nothing else ran either.
    return { needsAttention: true, reason: 'no_ci_activity' };
  }

  if (noCommitStatuses && buildRun && buildRun.conclusion !== null) {
    // Build ran to completion but never reported a commit status back.
    return { needsAttention: true, reason: 'build_completed_no_status' };
  }

  return { needsAttention: false, reason: 'ok' };
}

/**
 * Looks up the project item for a PR within the configured project, if it's
 * already been added to the board.
 */
async function findProjectItem({ github, contentId, projectId }) {
  const result = await github.graphql(
    `
      query($contentId: ID!) {
        node(id: $contentId) {
          ... on PullRequest {
            projectItems(first: 100) {
              nodes {
                id
                project { id }
                fieldValues(first: 20) {
                  nodes {
                    ... on ProjectV2ItemFieldSingleSelectValue {
                      name
                      field {
                        ... on ProjectV2SingleSelectField { name }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `,
    { contentId }
  );

  return result?.node?.projectItems?.nodes?.find((item) => item.project.id === projectId);
}

async function addItemToProject({ github, projectId, contentId }) {
  const result = await github.graphql(
    `
      mutation($input: AddProjectV2ItemByIdInput!) {
        addProjectV2ItemById(input: $input) {
          item { id }
        }
      }
    `,
    { input: { projectId, contentId } }
  );
  return result.addProjectV2ItemById.item.id;
}

async function updateStatusField({ github, projectId, itemId, fieldId, optionId }) {
  await github.graphql(
    `
      mutation($input: UpdateProjectV2ItemFieldValueInput!) {
        updateProjectV2ItemFieldValue(input: $input) {
          projectV2Item { id }
        }
      }
    `,
    {
      input: {
        projectId,
        itemId,
        fieldId,
        value: { singleSelectOptionId: optionId },
      },
    }
  );
}

module.exports = async ({ github }) => {
  const { owner, repo, label, project } = CONFIG;

  const prs = await fetchLabeledOpenPrs({ github, owner, repo, label });
  console.log(`Found ${prs.length} open "${label}" PR(s) on ${owner}/${repo}`);

  let flaggedCount = 0;

  for (const item of prs) {
    const prNumber = item.number;

    try {
      const { data: pr } = await github.rest.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      });

      if (pr.draft) {
        console.log(`PR #${prNumber}: draft, skipping`);
        continue;
      }

      const { needsAttention: flag, reason } = await needsAttention({ github, owner, repo, pr });

      if (!flag) {
        console.log(`PR #${prNumber}: no action needed (${reason})`);
        continue;
      }

      console.log(`PR #${prNumber}: needs attention (${reason})`);

      const existingItem = await findProjectItem({
        github,
        contentId: pr.node_id,
        projectId: project.projectId,
      });

      let itemId;
      if (existingItem) {
        itemId = existingItem.id;
        const currentStatus = existingItem.fieldValues.nodes.find(
          (fv) => fv.field?.name === 'Status'
        )?.name;

        if (currentStatus === 'Needs Attention') {
          console.log(`PR #${prNumber}: already Needs Attention on board, skipping update`);
          flaggedCount += 1;
          continue;
        }
      } else {
        itemId = await addItemToProject({
          github,
          projectId: project.projectId,
          contentId: pr.node_id,
        });
        console.log(`PR #${prNumber}: added to project board`);
      }

      await updateStatusField({
        github,
        projectId: project.projectId,
        itemId,
        fieldId: project.statusFieldId,
        optionId: project.needsAttentionOptionId,
      });
      console.log(`PR #${prNumber}: set status to Needs Attention`);
      flaggedCount += 1;
    } catch (error) {
      console.error(`Error processing PR #${prNumber}:`, error.message);
    }
  }

  console.log(`Done. ${flaggedCount} PR(s) flagged as Needs Attention.`);
};
