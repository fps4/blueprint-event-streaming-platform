import { CONFIG } from 'src/global-config';

import { ClientNewView } from 'src/sections/client/view/client-new-view';

export const metadata = { title: `Create Client | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <ClientNewView />;
}
