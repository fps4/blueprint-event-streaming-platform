import { CONFIG } from 'src/global-config';

import { ConnectionEditView } from 'src/sections/connection/view/connection-edit-view';

export const metadata = { title: `Edit Connection | Dashboard - ${CONFIG.appName}` };

export default function Page({ params }) {
  const { id } = params;
  return <ConnectionEditView connectionId={id} />;
}
