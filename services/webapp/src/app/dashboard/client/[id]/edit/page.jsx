import { CONFIG } from 'src/global-config';

import { ClientEditView } from 'src/sections/client/view/client-edit-view';

export const metadata = { title: `Edit Client | Dashboard - ${CONFIG.appName}` };

export default function Page({ params }) {
  const { id } = params;
  return <ClientEditView clientId={id} />;
}
