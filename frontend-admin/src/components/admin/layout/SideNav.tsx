import { NavLink } from 'react-router-dom';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/context/ThemeContext';

const navItems = [
  { path: '/', label: 'Usuarios' },
  { path: '/menu-items', label: 'Menú' },
  { path: '/ai-models', label: 'Modelos IA' },
  { path: '/api-keys', label: 'API Keys' },
  { path: '/orders', label: 'Órdenes' },
  { path: '/chat', label: 'Chat' },
];

const SideNav = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <SidebarProvider>
      <Sidebar side="left" collapsible="offcanvas">
        <SidebarHeader>
          <h2 className="text-lg font-semibold">Admin</h2>
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.path}>
                <NavLink to={item.path} end={item.path === '/'} className="block w-full">
                  {({ isActive }) => (
                    <SidebarMenuButton asChild isActive={isActive}>
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  )}
                </NavLink>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="mt-auto flex items-center gap-2 p-2">
          <Switch id="theme-toggle" checked={theme === 'dark'} onCheckedChange={toggleTheme} />
          <label htmlFor="theme-toggle" className="text-sm">
            {theme === 'dark' ? 'Oscuro' : 'Claro'}
          </label>
        </SidebarFooter>
      </Sidebar>
    </SidebarProvider>
  );
};

export default SideNav;
