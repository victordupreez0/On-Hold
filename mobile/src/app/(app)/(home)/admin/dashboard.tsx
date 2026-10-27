import { router } from 'expo-router';

import * as api from '@/api';
import { ActivityList } from '@/components/ActivityList';
import { StatGrid, StatTile } from '@/components/StatTile';
import { TrendChart } from '@/components/TrendChart';
import { ErrorState, Header, Loading, Screen, Section, TextLink } from '@/components/ui';
import { colors } from '@/theme';
import { useLoad } from '@/useLoad';

export default function AdminDashboard() {
  const dash = useLoad(api.getAdminDashboard);

  return (
    <Screen wide>
      <Header title="Dashboard" />
      {dash.error ? (
        <ErrorState message={dash.error} onRetry={dash.reload} />
      ) : !dash.data ? (
        <Loading />
      ) : (
        <>
          <StatGrid>
            <StatTile label="Users" value={dash.data.users.total} icon="users" tint={colors.grey} />
            <StatTile label="Checks" value={dash.data.checks.total} icon="search" tint={colors.safeTint} />
            <StatTile label="Reports pending" value={dash.data.reports.byStatus.pending} icon="clock" tint={colors.waitTint} />
            <StatTile label="AI calls (24h)" value={dash.data.aiCallsLast24h} icon="zap" tint={colors.highlighter} />
          </StatGrid>

          <Section title="This week">
            <StatGrid>
              <StatTile label="Active people" value={dash.data.users.active7Days} icon="activity" />
              <StatTile label="New sign-ups" value={dash.data.users.new7Days} icon="user-plus" />
              <StatTile label="Checks" value={dash.data.checks.last7Days} icon="trending-up" />
            </StatGrid>
          </Section>

          <Section title="All checks">
            <StatGrid>
              <StatTile label="Stop verdicts" value={dash.data.checks.byVerdict.stop} icon="octagon" tint={colors.stopTint} />
              <StatTile label="Wait verdicts" value={dash.data.checks.byVerdict.wait} icon="alert-triangle" tint={colors.waitTint} />
              <StatTile label="Safe verdicts" value={dash.data.checks.byVerdict.safe} icon="check-circle" tint={colors.safeTint} />
              <StatTile label="Scam warnings" value={dash.data.checks.byVerdict.info} icon="info" tint={colors.grey} />
            </StatGrid>
          </Section>

          <TrendChart data={dash.data.trend} label="Reports, last 14 days" />

          <Section title="Recent activity" action={<TextLink label="See all" onPress={() => router.push('/admin/activity')} />}>
            <ActivityList items={dash.data.activity} />
          </Section>
        </>
      )}
    </Screen>
  );
}
