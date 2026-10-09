const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
if (!token || !/^[\w-]+\/[\w.-]+$/.test(repository ?? '')) {
  throw new Error('GitHub repository and read-only token are required');
}
async function read(path) {
  const response = await fetch(`https://api.github.com/repos/${repository}/${path}`, {
    headers: {Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json'},
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Cannot verify deployment protection (${response.status}). The repository owner must configure gcp-demo.`);
  return response.json();
}
const environment = await read('environments/gcp-demo');
if (!environment.deployment_branch_policy?.custom_branch_policies) {
  throw new Error('gcp-demo must restrict deployments through a custom tag policy');
}
const {branch_policies: policies, total_count: count} = await read('environments/gcp-demo/deployment-branch-policies');
if (count !== 1 || policies.length !== 1 || policies[0].type !== 'tag' || policies[0].name !== 'v*') {
  throw new Error('gcp-demo must allow only the v* tag policy, with no branch policies');
}
const main = await read('branches/main');
if (!main.protected) throw new Error('Protect main before enabling automated deployment');
console.log('Protected main and gcp-demo release-tag policy verified');
