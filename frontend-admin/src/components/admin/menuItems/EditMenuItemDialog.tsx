import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { updateMenuItem } from '@/api/menuItemService';
import { useMenuItemStore } from '@/store/menuItemStore';
import type { MenuItem } from '@/store/menuItemStore';

interface Props { item: MenuItem }

const EditMenuItemDialog = ({ item }: Props) => {
    
  const { updateItem } = useMenuItemStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description);
  const [price, setPrice] = useState(item.price);
  const [category, setCategory] = useState(item.category);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updated = await updateMenuItem(item._id, { name, description, price, category, imageFile });
      updateItem(updated);
      setOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="mr-2">Editar</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar {item.name}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input placeholder="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} required />
          <Input type="number" placeholder="Precio" value={price} onChange={(e) => setPrice(Number(e.target.value))} required />
          <Input placeholder="Categoría" value={category} onChange={(e) => setCategory(e.target.value)} required />
          <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Actualizando...' : 'Guardar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditMenuItemDialog;
