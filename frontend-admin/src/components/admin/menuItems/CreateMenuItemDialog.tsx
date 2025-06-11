import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { addMenuItem } from '@/api/menuItemService';
import { useMenuItemStore } from '@/store/menuItemStore';

const CreateMenuItemDialog = () => {
  const { addItem } = useMenuItemStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [category, setCategory] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const newItem = await addMenuItem({ name, description, price, category, imageFile });
      addItem(newItem);
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
        <Button>Crear</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo Menú Item</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <Input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input placeholder="Descripción" value={description} onChange={(e) => setDescription(e.target.value)} required />
          <Input type="number" placeholder="Precio" value={price} onChange={(e) => setPrice(Number(e.target.value))} required />
          <Input placeholder="Categoría" value={category} onChange={(e) => setCategory(e.target.value)} required />
          <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creando...' : 'Crear'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateMenuItemDialog;
