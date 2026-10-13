import * as api from '@/api';
import { StatGrid, StatTile } from '@/components/StatTile';
import { TrendChart } from '@/components/TrendChart';
import { ErrorState, Header, ListGroup, ListRow, Loading, Screen, Section, timeAgo, type IconName } from '@/components/ui';
import { colors } from '@/theme';
import { useLoad } from '@/useLoad';

const ACTIVITY_ICON: Record<'check' | 'report' | 'signup', IconName> = {
  check: 'search',
  report: 'flag',
  signup: 'user-plus',
};

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
              <StatTile label="Checks, last 7 days" value={dash.data.checks.last7Days} icon="trending-up" />
              <StatTile label="Stop verdicts" value={dash.data.checks.byVerdict.stop} icon="octagon" tint={colors.stopTint} />
              <StatTile label="Wait verdicts" value={dash.data.checks.byVerdict.wait} icon="alert-triangle" tint={colors.waitTint} />
              <StatTile label="Safe verdicts" value={dash.data.checks.byVerdict.safe} icon="check-circle" tint={colors.safeTint} />
            </StatGrid>
          </Section>

          <TrendChart data={dash.data.trend} label="Reports, last 14 days" />

          <Section title="Recent activity">
            <ListGroup>
              {dash.data.activity.map((a) => (
                <ListRow
                  key={`${a.type}-${a.id}`}
                  icon={ACTIVITY_ICON[a.type]}
                  title={a.summary}
                  subtitle={`${a.type === 'check' ? 'Check' : a.type === 'report' ? 'Report' : 'New sign-up'} · ${timeAgo(a.createdAt)}`}
                />
              ))}
            </ListGroup>
          </Section>
        </>
      )}
    </Screen>
  );
}
