import { useEffect } from 'react';
import { listApiKeys } from '@/api/apiKeyService';
import { useApiKeyStore } from '@/store/apiKeyStore';
import ApiKeysTable from '@/components/admin/apiKeys/ApiKeysTable';
import CreateApiKeyDialog from '@/components/admin/apiKeys/CreateApiKeyDialog';

const ApiKeysPage = () => {
  const { setKeys } = useApiKeyStore();

  useEffect(() => {
    (async () => {
      const keys = await listApiKeys();
      setKeys(keys);
    })();
  }, [setKeys]);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">API Keys</h2>
        <CreateApiKeyDialog />
      </div>
      <ApiKeysTable />
    </div>
  );
};

export default ApiKeysPage;
