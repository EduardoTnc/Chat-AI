import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useApiKeyStore } from '@/store/apiKeyStore';
import DeleteApiKeyDialog from './DeleteApiKeyDialog';
import EditApiKeyDialog from './EditApiKeyDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ApiKey } from '@/api/apiKeyService';

interface ApiKeysTableProps {
  isLoading?: boolean;
  error?: string | null;
  keys?: ApiKey[];
}

const ApiKeysTable = ({ isLoading = false, error = null, keys }: ApiKeysTableProps) => {
  // If keys prop is not provided, fall back to the store
  const storeKeys = useApiKeyStore(state => state.keys);
  const displayKeys = keys && keys.length > 0 ? keys : storeKeys;

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error al cargar las claves API: {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (displayKeys.length === 0) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-4 w-4 text-amber-600 mr-2" />
          <p className="text-sm text-amber-800">
            No hay claves API configuradas. Crea una nueva para comenzar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Proveedor</TableHead>
            <TableHead>Key</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead className="w-[120px]">Estado</TableHead>
            <TableHead className="w-[180px] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayKeys.map((key) => (
            <TableRow key={`${key.provider}-${key._id}`}>
              <TableCell className="font-medium">
                <span className="capitalize">{key.provider}</span>
              </TableCell>
              <TableCell className="font-mono text-sm">
                <code className="bg-gray-100 px-2 py-1 rounded">
                  {key.maskedKey}
                </code>
              </TableCell>
              <TableCell className="max-w-[300px] truncate">
                {key.description || <span className="text-muted-foreground">Sin descripción</span>}
              </TableCell>
              <TableCell>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  key.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {key.status === 'active' ? 'Activo' : 'Inactivo'}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <EditApiKeyDialog 
                    provider={key.provider} 
                    currentDescription={key.description ?? ''} 
                    keyId={key._id}
                  />
                  <DeleteApiKeyDialog 
                    provider={key.provider}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ApiKeysTable;
