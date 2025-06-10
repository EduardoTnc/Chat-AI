import { useState } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAdminStore } from '@/store/adminStore';
import { deleteUser } from '@/api/userService';

interface DeleteUserDialogProps {
    userId: string;
    userName: string;
    isDeleted: boolean;
}

const DeleteUserDialog = ({ userId, userName, isDeleted }: DeleteUserDialogProps) => {
    const { updateUser } = useAdminStore();
    const [error, setError] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setError('');
        setIsDeleting(true);
        try {
            const updatedUser = await deleteUser(userId);
            updateUser(updatedUser);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to delete user');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isDeleted}>Delete</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action will mark the user "{userName}" as deleted. They will no longer be able to log in.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                        {isDeleting ? 'Deleting...' : 'Continue'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default DeleteUserDialog;
