import { SFTPImportAdmin } from '@/components/sftp-import-admin';
import { MlModelsAdmin } from '@/components/ml-models-admin';

export default function AdminPage() {
  return (
    <div className="space-y-10">
      <SFTPImportAdmin />
      <MlModelsAdmin />
    </div>
  );
}
