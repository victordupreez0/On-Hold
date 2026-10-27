import { router } from 'expo-router';

import type { Activity, ActivityType } from '@/api';
import { ListGroup, ListRow, timeAgo, type IconName } from './ui';

export const ACTIVITY: Record<ActivityType, { icon: IconName; label: string }> = {
  signup: { icon: 'user-plus', label: 'Sign-ups' },
  signin: { icon: 'log-in', label: 'Sign-ins' },
  check: { icon: 'search', label: 'Checks' },
  chat: { icon: 'message-circle', label: 'Questions' },
  report: { icon: 'flag', label: 'Reports' },
  moderation: { icon: 'shield', label: 'Moderation' },
  invite: { icon: 'send', label: 'Invites' },
  family: { icon: 'users', label: 'Family links' },
  help: { icon: 'life-buoy', label: 'Asked for help' },
};

/** What people did, newest first. A row opens the report it's about, or the person who did it
 * (unless that's the person whose page this already is). */
export function ActivityList({ items, forUserId }: { items: Activity[]; forUserId?: string }) {
  return (
    <ListGroup>
      {items.map((a) => {
        const isReport = a.type === 'report' || a.type === 'moderation';
        const open = isReport ? () => router.push(`/admin/reports/${a.id}`) : a.userId === forUserId ? undefined : () => router.push(`/admin/users/${a.userId}`);
        return (
          <ListRow
            key={`${a.type}-${a.id}-${a.createdAt}`}
            icon={ACTIVITY[a.type].icon}
            title={forUserId ? a.summary : a.userName}
            subtitle={forUserId ? timeAgo(a.createdAt) : `${a.summary} · ${timeAgo(a.createdAt)}`}
            onPress={open}
          />
        );
      })}
    </ListGroup>
  );
}
