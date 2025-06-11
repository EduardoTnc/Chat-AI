import { Outlet } from 'react-router-dom';
import SideNav from './SideNav';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';

const DashboardLayout = () => {
  const { logout, user } = useAuth();
  return (
    <div className="flex h-screen w-full">
      <SideNav />
      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-between border-b p-4">
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
          <div>
            <span className="mr-4">{user?.name}</span>
            <Button variant="outline" size="sm" onClick={logout}>
              Logout
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
