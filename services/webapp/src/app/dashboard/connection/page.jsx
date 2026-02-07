import { CONFIG } from 'src/global-config';

import { ConnectionListView } from 'src/sections/connection/view/connection-list-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Connection List | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <ConnectionListView />;
}
