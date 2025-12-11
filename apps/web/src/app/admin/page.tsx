import { SFTPImportAdmin } from '@/components/sftp-import-admin';
import { MlModelsAdmin } from '@/components/ml-models-admin';
import { UserWhitelistAdmin } from '@/components/user-whitelist-admin';

export default function AdminPage() {
  return (
    <div className="space-y-10">
      <UserWhitelistAdmin />
      <SFTPImportAdmin />
      <MlModelsAdmin />
    </div>
  );
}
