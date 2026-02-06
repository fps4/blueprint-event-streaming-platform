import { CONFIG } from 'src/global-config';

import { ClientListView } from 'src/sections/client/view/client-list-view';

// ----------------------------------------------------------------------

export const metadata = { title: `Client List | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <ClientListView />;
}
