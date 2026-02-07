import { CONFIG } from 'src/global-config';

import { ConnectionNewView } from 'src/sections/connection/view/connection-new-view';

export const metadata = { title: `Create Connection | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <ConnectionNewView />;
}
