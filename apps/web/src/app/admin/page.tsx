import { SFTPImportAdmin } from '@/components/admin/sftp-import-admin';
import { UserWhitelistAdmin } from '@/components/admin/user-whitelist-admin';
import { PredictiveConnectionsAdmin } from '@/components/admin/predictive-connections-admin';

export default function AdminPage() {
  return (
    <div className="space-y-10">
      <UserWhitelistAdmin />
      <PredictiveConnectionsAdmin />
      <SFTPImportAdmin />
    </div>
  );
}
