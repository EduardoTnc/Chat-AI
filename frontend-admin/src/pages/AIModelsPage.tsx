import { useEffect } from 'react';
import { useAIModelStore } from '@/store/aiModelStore';
import { listAIModels } from '@/api/aiModelService';
import AIModelsTable from '@/components/admin/aiModels/AIModelsTable';
import CreateModelDialog from '@/components/admin/aiModels/CreateModelDialog';

const AIModelsPage = () => {
  const { setModels } = useAIModelStore();

  useEffect(() => {
    (async () => {
      const models = await listAIModels();
      setModels(models);
    })();
  }, [setModels]);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">Modelos de IA</h2>
        <CreateModelDialog />
      </div>
      <AIModelsTable />
    </div>
  );
};

export default AIModelsPage;
