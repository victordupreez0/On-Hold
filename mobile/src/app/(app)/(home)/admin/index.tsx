import { router } from 'expo-router';

import { Header, ListGroup, ListRow, Screen } from '@/components/ui';

export default function AdminHub() {
  return (
    <Screen>
      <Header title="Admin" />
      <ListGroup>
        <ListRow icon="bar-chart-2" title="Dashboard" subtitle="Headline stats, the scam trend, recent activity" onPress={() => router.push('/admin/dashboard')} />
        <ListRow icon="flag" title="Reports" subtitle="Moderate, edit or remove any report" onPress={() => router.push('/admin/reports')} />
        <ListRow icon="users" title="Users" subtitle="Search, change roles, remove accounts" onPress={() => router.push('/admin/users')} />
        <ListRow icon="book-open" title="Learn guides" subtitle="Add, edit or remove scam explainers" onPress={() => router.push('/admin/explainers')} />
        <ListRow icon="map-pin" title="Suburbs" subtitle="The areas people can pick from" onPress={() => router.push('/admin/suburbs')} />
      </ListGroup>
    </Screen>
  );
}
