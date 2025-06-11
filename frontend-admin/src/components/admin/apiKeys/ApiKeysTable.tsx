import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useApiKeyStore } from '@/store/apiKeyStore';
import DeleteApiKeyDialog from './DeleteApiKeyDialog';
import EditApiKeyDialog from './EditApiKeyDialog';

const ApiKeysTable = () => {
  const { keys } = useApiKeyStore();
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Proveedor</TableHead>
          <TableHead>Key</TableHead>
          <TableHead>Descripción</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {keys.map((k) => (
          <TableRow key={k.provider}>
            <TableCell>{k.provider}</TableCell>
            <TableCell>{k.maskedKey}</TableCell>
            <TableCell>{k.description ?? '-'}</TableCell>
            <TableCell>{k.status}</TableCell>
            <TableCell className="flex gap-2">
              <EditApiKeyDialog provider={k.provider} currentDescription={k.description ?? ''} />
              <DeleteApiKeyDialog provider={k.provider} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default ApiKeysTable;
