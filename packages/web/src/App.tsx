import { useState } from 'react';
import { useMetrics } from './hooks/useMetrics';
import { Header } from './components/Header';
import { TokenUsageCard } from './components/TokenUsageCard';
import { TodayCard } from './components/TodayCard';
import { CostBreakdownCard } from './components/CostBreakdownCard';
import { AttentionCard } from './components/AttentionCard';
import { SystemSummaryCard } from './components/SystemSummaryCard';
import { AutomationStatusCard } from './components/AutomationStatusCard';
import { AcpWorkflowSummaryCard } from './components/AcpWorkflowSummaryCard';
import { OfficialDashboardLinksCard } from './components/OfficialDashboardLinksCard';
import { SessionsCard } from './components/SessionsCard';
import { TaskLogCard } from './components/TaskLogCard';
import { ActivityCard } from './components/ActivityCard';
import { AcpWorkflowCard } from './components/AcpWorkflowCard';
import { LifetimeLedgerCard } from './components/LifetimeLedgerCard';
import { OverviewTabs } from './components/OverviewTabs';
import { Footer } from './components/Footer';

export function App() {
  const { data, acpWorkflow, wsStatus } = useMetrics();
  const [view, setView] = useState<'overview' | 'inspect'>('overview');

  const activity = data?.activity;
  const sessions = data?.status?.sessions?.recent ?? [];

  return (
    <>
      <div className="scanline" />
      <div className="dashboard">
        <Header data={data} />
        <OverviewTabs value={view} onChange={setView} />

        {view === 'overview' ? (
          <section className="page-section">
            <div className="grid grid-overview">
              <TokenUsageCard usageCost={data?.usageCost} ledger={data?.ledger} />
              <TodayCard usageCost={data?.usageCost} hourlyActivity={activity?.hourlyActivity} />
              <AttentionCard data={data} workflow={acpWorkflow} wsStatus={wsStatus} />
              <CostBreakdownCard totals={data?.usageCost?.totals} />
              <SystemSummaryCard data={data} workflow={acpWorkflow} wsStatus={wsStatus} />
              <AutomationStatusCard automation={data?.automation} />
              <AcpWorkflowSummaryCard workflow={acpWorkflow} />
              <OfficialDashboardLinksCard info={data?.officialDashboard} />
            </div>
          </section>
        ) : (
          <>
            <section className="page-section">
              <div className="grid grid-inspect-primary">
                <SessionsCard sessions={sessions} />
                <TaskLogCard tasks={activity?.tasks ?? []} />
              </div>
            </section>
            <section className="page-section">
              <div className="grid grid-inspect-secondary">
                <ActivityCard recent={activity?.recent ?? []} />
                <LifetimeLedgerCard ledger={data?.ledger} />
              </div>
            </section>
            <section className="page-section">
              <div className="grid grid-workflow">
                <AcpWorkflowCard workflow={acpWorkflow} />
              </div>
            </section>
          </>
        )}
        <Footer timestamp={data?.timestamp} system={data?.system} />
      </div>
    </>
  );
}
