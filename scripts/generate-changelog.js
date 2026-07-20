import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const outputPath = path.join(projectRoot, 'release-notes.md');

function runGit(command) {
  try {
    return execSync(command, { cwd: projectRoot, encoding: 'utf8' }).trim();
  } catch (error) {
    console.warn(`Git command failed: ${command}. Error: ${error.message}`);
    return null;
  }
}

function getRepoUrl() {
  const remoteUrl = runGit('git remote get-url origin');
  if (!remoteUrl) return 'https://github.com/gi2k15/myoplay';
  
  // Handle ssh and https formats
  return remoteUrl
    .trim()
    .replace(/^git@github\.com:/, 'https://github.com/')
    .replace(/\.git$/, '');
}

async function main() {
  console.log('Generating changelog from git commits...');

  // 1. Get the current tag or HEAD
  let currentRef = process.env.GITHUB_REF_NAME; // In Github Actions, this holds the tag name (e.g., v0.41.0)
  if (!currentRef) {
    // Try to get tag pointing to HEAD
    currentRef = runGit('git describe --tags --exact-match HEAD');
  }
  if (!currentRef) {
    // Fallback to current HEAD hash
    currentRef = runGit('git rev-parse --short HEAD') || 'HEAD';
  }

  // 2. Get the previous tag
  // Try to describe the parent of HEAD to find the closest ancestor tag
  let previousTag = runGit('git describe --tags --abbrev=0 HEAD~1');

  // If we couldn't find a previous tag using HEAD~1, let's find the most recent tag before currentRef using list
  if (!previousTag) {
    const allTagsRaw = runGit('git tag --sort=-v:refname');
    if (allTagsRaw) {
      const tags = allTagsRaw.split('\n').filter(Boolean);
      const currentIndex = tags.indexOf(currentRef);
      if (currentIndex !== -1 && currentIndex + 1 < tags.length) {
        previousTag = tags[currentIndex + 1];
      } else if (tags.length > 0 && tags[0] !== currentRef) {
        previousTag = tags[0];
      }
    }
  }

  let range = '';
  if (previousTag) {
    console.log(`Found previous tag: ${previousTag}`);
    console.log(`Current ref: ${currentRef}`);
    range = `${previousTag}..HEAD`;
  } else {
    console.log('No previous tag found. Generating changelog since repository creation.');
    range = 'HEAD';
  }

  // 3. Get the commits in range
  // Format: hash|subject|author
  const logFormat = '%h|%s|%an';
  const gitLogCmd = `git log ${range} --format="${logFormat}"`;
  const logOutput = runGit(gitLogCmd);

  if (!logOutput) {
    const fallbackContent = `## Release ${currentRef}\n\nIncremental update release.`;
    await fs.writeFile(outputPath, fallbackContent, 'utf8');
    console.log('No commits found or git log failed. Wrote fallback release notes.');
    return;
  }

  const commits = logOutput.split('\n').filter(Boolean).map(line => {
    const [hash, subject, author] = line.split('|');
    return { hash, subject, author };
  });

  // 4. Categorize commits
  const categories = {
    features: { title: '🚀 Features', items: [] },
    fixes: { title: '🐛 Bug Fixes', items: [] },
    perf: { title: '⚡ Performance Improvements', items: [] },
    docs: { title: '📝 Documentation', items: [] },
    refactor: { title: '🔧 Refactoring & Styles', items: [] },
    chore: { title: '🏠 Internal / Chores', items: [] },
    others: { title: 'Other Changes', items: [] }
  };

  // Conventional commit parser regex: type(scope)?: description
  const commitRegex = /^(\w+)(?:\(([^)]+)\))?\s*:\s*(.+)$/;

  for (const commit of commits) {
    const match = commit.subject.match(commitRegex);
    let type = 'others';
    let message = commit.subject;

    if (match) {
      const commitType = match[1].toLowerCase();
      const scope = match[2];
      const desc = match[3];

      message = scope ? `**${scope}**: ${desc}` : desc;

      if (['feat', 'feature'].includes(commitType)) {
        type = 'features';
      } else if (['fix', 'bugfix'].includes(commitType)) {
        type = 'fixes';
      } else if (commitType === 'perf') {
        type = 'perf';
      } else if (commitType === 'docs') {
        type = 'docs';
      } else if (['refactor', 'style'].includes(commitType)) {
        type = 'refactor';
      } else if (['chore', 'test', 'ci', 'build'].includes(commitType)) {
        type = 'chore';
      }
    }

    categories[type].items.push(`- ${message} (${commit.hash})`);
  }

  // 5. Build markdown
  let markdown = `## What's Changed in ${currentRef}\n\n`;

  let hasContent = false;
  for (const key of ['features', 'fixes', 'perf', 'docs', 'refactor', 'chore', 'others']) {
    const cat = categories[key];
    if (cat.items.length > 0) {
      markdown += `### ${cat.title}\n\n`;
      markdown += cat.items.join('\n') + '\n\n';
      hasContent = true;
    }
  }

  if (!hasContent) {
    markdown += `Incremental updates and bug fixes.\n\n`;
  }

  const repoUrl = getRepoUrl();
  if (previousTag) {
    // Add a link or text comparing the changes
    markdown += `**Full Changelog**: [${previousTag}...${currentRef}](${repoUrl}/compare/${previousTag}...${currentRef})\n`;
  }

  await fs.writeFile(outputPath, markdown, 'utf8');
  console.log(`Changelog written to ${outputPath}`);
}

main().catch(err => {
  console.error('Failed to generate changelog:', err);
  process.exit(1);
});
