import { constants, copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const source = resolve('.github/deployment/deploy.yml');
const destination = resolve('.github/workflows/deploy.yml');

async function main(): Promise<void> {
  await mkdir(dirname(destination), { recursive: true });

  try {
    await copyFile(source, destination, constants.COPYFILE_EXCL);
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      console.error(
        'Deployment is already enabled. Remove .github/workflows/deploy.yml first if you want to regenerate it.',
      );
      process.exitCode = 1;
      return;
    }

    throw error;
  }

  console.log('Created .github/workflows/deploy.yml');
  console.log(
    'Deployment remains disabled until the DEPLOYMENT_ENABLED repository variable is set to true.',
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
