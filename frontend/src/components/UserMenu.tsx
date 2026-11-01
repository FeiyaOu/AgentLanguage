import { useNavigate } from 'react-router-dom';
import { ArrowRightStartOnRectangleIcon, ClockIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { Avatar, Button, Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger, Skeleton, cn, toast } from '../ui';
import { useAuth } from '../auth/AuthContext';

/**
 * Right side of the nav. Three states:
 *  - loading: avatar-sized skeleton, so "Log in" never flashes before the avatar appears
 *  - guest: Log in button
 *  - authenticated: avatar menu
 */
export function UserMenu() {
  const { status, user, logout, openLogin } = useAuth();
  const navigate = useNavigate();

  if (status === 'loading') {
    return <Skeleton className="size-8 rounded-pill" />;
  }

  if (status === 'guest' || !user) {
    return (
      <Button size="sm" onClick={openLogin}>
        Log in
      </Button>
    );
  }

  return (
    <Menu>
      <MenuTrigger
        className={cn(
          'rounded-pill outline-none transition-shadow duration-fast ease-standard',
          'hover:ring-2 hover:ring-accent-line data-[state=open]:ring-2 data-[state=open]:ring-accent-line',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        )}
        aria-label="Account menu"
      >
        <Avatar name={user.name} size="sm" tone="solid" />
      </MenuTrigger>
      <MenuContent>
        <MenuLabel>
          <div className="text-body-sm font-medium text-fg">{user.name}</div>
          <div className="text-caption text-muted truncate">{user.email}</div>
        </MenuLabel>
        <MenuSeparator />
        <MenuItem icon={<ClockIcon />} onSelect={() => navigate('/history')}>
          History
        </MenuItem>
        <MenuItem icon={<Cog6ToothIcon />} onSelect={() => toast('Settings are coming soon')}>
          Settings
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={<ArrowRightStartOnRectangleIcon />} tone="danger" onSelect={logout}>
          Log out
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
