import path from 'path';
import { readFile } from 'fs/promises';

import { CONFIG } from 'src/global-config';

import { UserManualQuickStartView } from 'src/sections/manuals/view/user-manual-quick-start-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Quick Start | User Manual - ${CONFIG.appName}` };

async function loadQuickStartContent() {
  const quickStartPath = path.join(
    process.cwd(),
    'src',
    'content',
    'manuals',
    'user-manual',
    'quick-start.md'
  );

  try {
    return await readFile(quickStartPath, 'utf8');
  } catch {
    return '# Quick Start\n\nQuick Start content is temporarily unavailable.';
  }
}

export default async function Page() {
  const content = await loadQuickStartContent();

  return <UserManualQuickStartView content={content} />;
}
