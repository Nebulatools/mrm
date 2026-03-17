import { SFTPImportAdmin } from '@/components/admin/sftp-import-admin';
import { UserWhitelistAdmin } from '@/components/admin/user-whitelist-admin';

export default function AdminPage() {
  return (
    <div className="space-y-10">
      <UserWhitelistAdmin />
      <SFTPImportAdmin />
    </div>
  );
}
