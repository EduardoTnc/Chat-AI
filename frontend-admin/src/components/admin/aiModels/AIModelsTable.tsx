import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAIModelStore } from '@/store/aiModelStore';
import EditModelDialog from './EditModelDialog';
import DeleteModelDialog from './DeleteModelDialog';

const AIModelsTable = () => {
  const { models } = useAIModelStore();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Proveedor</TableHead>
          <TableHead>ID Modelo</TableHead>
          <TableHead>Precio 1K In</TableHead>
          <TableHead>Precio 1K Out</TableHead>
          <TableHead>Máx Tokens</TableHead>
          <TableHead>Activo</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {models.map((m) => (
          <TableRow key={m._id}>
            <TableCell>{m.name}</TableCell>
            <TableCell>{m.provider}</TableCell>
            <TableCell>{m.modelId}</TableCell>
            <TableCell>${m.pricePer1KInputTokens}</TableCell>
            <TableCell>${m.pricePer1KOutputTokens}</TableCell>
            <TableCell>{m.maxTokens}</TableCell>
            <TableCell>{m.enabled ? 'Sí' : 'No'}</TableCell>
            <TableCell>
              <EditModelDialog model={m} />
              <DeleteModelDialog id={m._id} name={m.name} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default AIModelsTable;
