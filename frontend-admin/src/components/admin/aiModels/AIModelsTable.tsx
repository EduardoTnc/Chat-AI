import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAIModelStore } from '@/store/aiModelStore';
import EditModelDialog from './EditModelDialog';
import DeleteModelDialog from './DeleteModelDialog';
import type { AIModel } from '@/api/aiModelService';

const AIModelsTable = () => {
  const { models } = useAIModelStore();
  
  const getProviderBadgeVariant = (provider: string) => {
    switch (provider) {
      case 'openai': return 'default';
      case 'ollama': return 'secondary';
      case 'custom': return 'outline';
      default: return 'default';
    }
  };

  const getStatusBadgeVariant = (isActive: boolean, isVisible: boolean) => {
    if (!isActive) return 'destructive';
    return isVisible ? 'default' : 'secondary';
  };

  const getStatusText = (isActive: boolean, isVisible: boolean) => {
    if (!isActive) return 'Inactivo';
    return isVisible ? 'Público' : 'Privado';
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Proveedor</TableHead>
          <TableHead>ID Modelo</TableHead>
          <TableHead>Roles</TableHead>
          <TableHead>Herramientas</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {models.map((model: AIModel) => (
          <TableRow key={model._id}>
            <TableCell className="font-medium">
              <div>
                <div>{model.name}</div>
                {model.description && (
                  <div className="text-xs text-muted-foreground">
                    {model.description}
                  </div>
                )}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={getProviderBadgeVariant(model.provider)}>
                {model.provider.toUpperCase()}
              </Badge>
            </TableCell>
            <TableCell className="font-mono text-xs">
              {model.modelId}
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {model.allowedRoles.map(role => (
                  <Badge key={role} variant="outline" className="text-xs">
                    {role}
                  </Badge>
                ))}
              </div>
            </TableCell>
            <TableCell>
              {model.supportsTools ? (
                <Badge variant="outline">Soporte</Badge>
              ) : (
                <span className="text-muted-foreground">No</span>
              )}
            </TableCell>
            <TableCell>
              <Badge variant={getStatusBadgeVariant(model.isActive, model.isVisibleToClient)}>
                {getStatusText(model.isActive, model.isVisibleToClient)}
              </Badge>
              {model.isDefault && (
                <Badge variant="secondary" className="ml-1">
                  Predeterminado
                </Badge>
              )}
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                <EditModelDialog model={model} />
                <DeleteModelDialog 
                  id={model._id} 
                  name={model.name} 
                  isDefault={model.isDefault} 
                />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default AIModelsTable;
