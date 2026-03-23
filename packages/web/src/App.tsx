import { useMetrics } from './hooks/useMetrics';
import { Header } from './components/Header';
import { TokenUsageCard } from './components/TokenUsageCard';
import { TodayCard } from './components/TodayCard';
import { CostBreakdownCard } from './components/CostBreakdownCard';
import { SessionsCard } from './components/SessionsCard';
import { TaskLogCard } from './components/TaskLogCard';
import { ActivityCard } from './components/ActivityCard';
import { AcpWorkflowCard } from './components/AcpWorkflowCard';
import { Footer } from './components/Footer';

export function App() {
  const { data, acpWorkflow } = useMetrics();

  const activity = data?.activity;
  const sessions = data?.status?.sessions?.recent ?? [];

  return (
    <>
      <div className="scanline" />
      <div className="dashboard">
        <Header data={data} />
        <section className="page-section page-section-hero">
          <div className="grid grid-hero">
            <TokenUsageCard usageCost={data?.usageCost} ledger={data?.ledger} />
            <TodayCard usageCost={data?.usageCost} hourlyActivity={activity?.hourlyActivity} />
            <CostBreakdownCard totals={data?.usageCost?.totals} />
          </div>
        </section>
        <section className="page-section page-section-detail">
          <div className="grid grid-detail">
            <SessionsCard sessions={sessions} />
            <TaskLogCard tasks={activity?.tasks ?? []} />
            <ActivityCard recent={activity?.recent ?? []} />
          </div>
        </section>
        <section className="page-section page-section-workflow">
          <div className="grid grid-workflow">
            <AcpWorkflowCard workflow={acpWorkflow} />
          </div>
        </section>
        <Footer timestamp={data?.timestamp} system={data?.system} />
      </div>
    </>
  );
}
