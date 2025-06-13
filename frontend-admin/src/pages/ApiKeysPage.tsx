import { useEffect, useState } from 'react';
import { listApiKeys } from '@/api/apiKeyService';
import { useApiKeyStore } from '@/store/apiKeyStore';
import ApiKeysTable from '@/components/admin/apiKeys/ApiKeysTable';
import CreateApiKeyDialog from '@/components/admin/apiKeys/CreateApiKeyDialog';
import { PageHeader } from '@/components/admin/layout/PageHeader';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const ApiKeysPage = () => {
  const { setKeys, keys } = useApiKeyStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchApiKeys = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const fetchedKeys = await listApiKeys();
        setKeys(fetchedKeys);
      } catch (err) {
        console.error('Error loading API keys:', err);
        setError('No se pudieron cargar las claves API. Por favor, intenta de nuevo.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchApiKeys();
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
        
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <ApiKeysTable 
          isLoading={isLoading} 
          error={error}
          keys={keys}
        />
      </main>
    </div>
  );
};

export default ApiKeysPage;
