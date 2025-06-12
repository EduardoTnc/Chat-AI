import { useEffect } from 'react';
import { useAIModelStore } from '@/store/aiModelStore';
import { listAIModels } from '@/api/aiModelService';
import AIModelsTable from '@/components/admin/aiModels/AIModelsTable';
import CreateModelDialog from '@/components/admin/aiModels/CreateModelDialog';
import { PageHeader } from '@/components/admin/layout/PageHeader';

const AIModelsPage = () => {
  const { setModels } = useAIModelStore();

  useEffect(() => {
    (async () => {
      const models = await listAIModels();
      setModels(models);
    })();
  }, [setModels]);

  return (
    <div className="h-screen w-full flex flex-col">
      <main className="flex-grow p-4">
        <PageHeader 
          title="Modelos de IA" 
          description="Administra los modelos de IA"
        >
          <CreateModelDialog />
        </PageHeader>
        <AIModelsTable />
      </main>
    </div>
  );
};

export default AIModelsPage;
