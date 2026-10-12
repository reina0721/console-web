'use client';
import { useMemo } from 'react';
import { useProductAccess, type IdentityPermission } from '@community-go/surface/identity';
import type { NavigationGroup, NavigationNode } from '@community-go/types';
import { combinedShellNavigationGroups } from './navigation';

/** Product entry visibility only. It does not replace route or REST authorization. */
function requiredPermission(id: string): IdentityPermission | null {
  if (id === 'users.root') return 'users.read';
  if (id === 'roles.root') return 'roles.read';
  if (id === 'audit.root') return 'audit.read';
  return null;
}
export function useProductNavigation() {
  const access = useProductAccess();
  return useMemo(() => {
    function visible(node: NavigationNode): NavigationNode | null {
      const permission = requiredPermission(node.id);
      if (permission && !access.data?.permissions.includes(permission)) return null;
      if (node.kind === 'leaf') return node;
      const children = node.children.map(visible).filter((child) => child !== null);
      const [first, ...rest] = children;
      return first ? { ...node, children: [first, ...rest] } : null;
    }
    const groups: NavigationGroup[] = [];
    for (const group of combinedShellNavigationGroups) {
      const [first, ...rest] = group.items.map(visible).filter((item) => item !== null);
      if (first) groups.push({ ...group, items: [first, ...rest] });
    }
    return groups;
  }, [access.data]);
}
