const execaRaw = require('execa');
const AWS = require('aws-sdk');

const AWS_REGION = 'us-east-2';

AWS.config.update({ region: AWS_REGION });

/**
 * Wrapper around `execa` that logs commands as they're run.
 *
 * @param {string} file
 * @param {string[]} args
 * @param {import('execa').Options} [options]
 */
const execa = (file, args, options) => {
  let command = file;
  if (args) {
    command += ` ${args.join(' ')}`;
  }
  console.log(`$ ${command}`);
  return execaRaw(file, args, {
    // Default to mirroring all output back to the user.
    stdout: 'inherit',
    stderr: 'inherit',
    ...options,
  });
};

const getImageTag = async () => {
  if (
    process.env.CI &&
    process.env.GITHUB_EVENT_NAME === 'pull_request' &&
    process.env.GITHUB_REF_NAME?.match(/^\d+\/merge$/)
  ) {
    // This is GitHub's automated merge commit on a pull request. However,
    // this commit doesn't actually exist on this branch, which means that
    // if we try to deploy this branch to a staging environment but tag the
    // image with the head SHA, the version that's deployed wouldn't match
    // the image tag. So, in this case, we use `HEAD^2` to get the the SHA
    // of the second parent of  the merge commit, which should be the commit
    // made by a user that actually triggered this workflow run.
    return (await execaRaw('git', ['rev-parse', 'HEAD^2'])).stdout;
  }

  return (await execaRaw('git', ['rev-parse', 'HEAD'])).stdout;
};

const getImageName = (tag) => {
  return `prairielearn/executor:${tag}`;
};

const getEcrRegistryUrl = async () => {
  // ECR registries are tied to account IDs. Determine the account ID dynamically
  // based on the credentials we're running with.
  const sts = new AWS.STS();
  const { Account: accountId } = await sts.getCallerIdentity().promise();

  return `${accountId}.dkr.ecr.${AWS_REGION}.amazonaws.com`;
};

const loginToEcr = async () => {
  const ecr = new AWS.ECR();
  const authData = await ecr.getAuthorizationToken().promise();
  const token = authData.authorizationData[0].authorizationToken;
  const [user, password] = Buffer.from(token, 'base64').toString().split(':');

  const ecrRegistryUrl = await getEcrRegistryUrl();

  await execa('docker', ['login', '--username', user, '--password-stdin', ecrRegistryUrl], {
    input: password,
  });
};

module.exports = {
  AWS,
  execa,
  getImageName,
  getImageTag,
  loginToEcr,
  getEcrRegistryUrl,
};