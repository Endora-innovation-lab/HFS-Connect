import { NavLink } from 'react-router-dom';
import { LucideIcon, LogOut } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import dashboardLogo from '@/assets/hfs-academy-logo.png.asset.json';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export interface SidebarItem {
  label: string;
  value: string;
  icon: LucideIcon;
}

interface AppSidebarProps {
  title: string;
  items: SidebarItem[];
  activeTab: string;
  onTabChange: (v: string) => void;
  userLabel?: string;
  userRoleLabel?: string;
  onLogout: () => void;
  hideLogout?: boolean;
}

export function AppSidebar({
  title,
  items,
  activeTab,
  onTabChange,
  userLabel,
  userRoleLabel,
  onLogout,
  hideLogout,
}: AppSidebarProps) {
  const { instituteCode } = useAuth();
  const { setOpenMobile, isMobile } = useSidebar();

  const handleSelect = (value: string) => {
    onTabChange(value);
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="border-b">
        <div className="flex items-center gap-3 px-2 py-3">
          <img src={dashboardLogo.url} alt="HFS Connect logo" className="h-9 w-9 object-contain shrink-0" />
          <div className="min-w-0">
            <div className="font-bold text-sm truncate">{title}</div>
            {instituteCode && (
              <div className="text-[11px] text-sidebar-foreground/70 truncate">
                {instituteCode}
              </div>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.value;
                return (
                  <SidebarMenuItem key={item.value}>
                    <SidebarMenuButton
                      isActive={active}
                      onClick={() => handleSelect(item.value)}
                      className={
                        active
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium hover:bg-sidebar-primary/90'
                          : ''
                      }
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        {userLabel && (
          <div className="px-2 py-2">
            <div className="text-sm font-medium truncate">{userLabel}</div>
            {userRoleLabel && (
              <div className="text-xs text-sidebar-foreground/70">{userRoleLabel}</div>
            )}
          </div>
        )}
        {!hideLogout && (
          <Button variant="outline" size="sm" className="w-full justify-start" onClick={onLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
