import { useEffect } from 'react';
import { listApiKeys } from '@/api/apiKeyService';
import { useApiKeyStore } from '@/store/apiKeyStore';
import ApiKeysTable from '@/components/admin/apiKeys/ApiKeysTable';
import CreateApiKeyDialog from '@/components/admin/apiKeys/CreateApiKeyDialog';
import { PageHeader } from '@/components/admin/layout/PageHeader';

const ApiKeysPage = () => {
  const { setKeys } = useApiKeyStore();

  useEffect(() => {
    (async () => {
      const keys = await listApiKeys();
      setKeys(keys);
    })();
  }, [setKeys]);

  return (
    <div className="h-screen w-full flex flex-col">
      <main className="flex-grow p-4">
        <PageHeader 
          title="API Keys" 
          description="Administra las claves de API"
        >
          <CreateApiKeyDialog />
        </PageHeader>
        <ApiKeysTable />
      </main>
    </div>
  );
};

export default ApiKeysPage;
