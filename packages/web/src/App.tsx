import { useState, type CSSProperties } from 'react';
import { useMetrics } from './hooks/useMetrics';
import { useHeaderCollapse } from './hooks/useHeaderCollapse';
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
import { BrandMarkIcon } from './components/BrandMarkIcon';
import { OverviewTabs } from './components/OverviewTabs';
import { Footer } from './components/Footer';

export function App() {
  const { data, acpWorkflow, wsStatus } = useMetrics();
  const { isCollapsed, collapseProgress } = useHeaderCollapse();
  const [view, setView] = useState<'overview' | 'inspect'>('overview');

  const activity = data?.activity;
  const sessions = data?.status?.sessions?.recent ?? [];
  const activeTasks = (activity?.tasks ?? []).filter((task) => task.isActive).length;
  const recentActivityCount = activity?.recent?.length ?? 0;

  const viewContent =
    view === 'overview'
      ? {
          eyebrow: 'Operations',
          title: '总览',
          brandLabel: '小锤子观测面',
        }
      : {
          eyebrow: 'Inspect Mode',
          title: '检修',
          brandLabel: '小锤子检修面',
        };

  const dashboardStyle = {
    '--header-collapse-progress': collapseProgress,
  } as CSSProperties;

  return (
    <div className="dashboard-shell">
      <div className="dashboard-backdrop" />
      <div className="scanline" />
      <div className={`dashboard${isCollapsed ? ' dashboard-collapsed' : ''}`} style={dashboardStyle}>
        <Header data={data} isCollapsed={isCollapsed} />
        <section className={`view-switcher${isCollapsed ? ' is-collapsed' : ''}`}>
          <div className="view-copy">
            <div className="view-copy-top">
              <span className="eyebrow">{viewContent.eyebrow}</span>
              <span className="view-brand-chip">
                <BrandMarkIcon className="view-brand-icon" />
                <span>{viewContent.brandLabel}</span>
              </span>
            </div>
            <h2 className="view-heading">{viewContent.title}</h2>
          </div>
          <OverviewTabs value={view} onChange={setView} compact={isCollapsed} />
        </section>

        {view === 'overview' ? (
          <section className="page-section">
            <div className="section-heading">
              <div className="section-title-block">
                <h3 className="section-title">核心态势</h3>
                <p className="section-description">健康、成本、自动化、ACP。</p>
              </div>
              <div className="section-meta">
                <span>{sessions.length} 个会话</span>
                <span>{recentActivityCount} 条实时动态</span>
              </div>
            </div>
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
              <div className="section-heading">
                <div className="section-title-block">
                  <h3 className="section-title">会话与任务</h3>
                  <p className="section-description">按热度优先看。</p>
                </div>
                <div className="section-meta">
                  <span>运行中任务 {activeTasks}</span>
                </div>
              </div>
              <div className="grid grid-inspect-primary">
                <SessionsCard sessions={sessions} />
                <TaskLogCard tasks={activity?.tasks ?? []} />
              </div>
            </section>
            <section className="page-section">
              <div className="section-heading">
                <div className="section-title-block">
                  <h3 className="section-title">动态与账本</h3>
                  <p className="section-description">动态与累计账本。</p>
                </div>
                <div className="section-meta">
                  <span>实时动态 {recentActivityCount}</span>
                </div>
              </div>
              <div className="grid grid-inspect-secondary">
                <ActivityCard recent={activity?.recent ?? []} />
                <LifetimeLedgerCard ledger={data?.ledger} />
              </div>
            </section>
            <section className="page-section">
              <div className="section-heading">
                <div className="section-title-block">
                  <h3 className="section-title">ACP 深查</h3>
                  <p className="section-description">工作流阶段与事件。</p>
                </div>
                <div className="section-meta">
                  <span>活跃工作流 {acpWorkflow?.stats.activeSessions ?? 0}</span>
                </div>
              </div>
              <div className="grid grid-workflow">
                <AcpWorkflowCard workflow={acpWorkflow} />
              </div>
            </section>
          </>
        )}
        <Footer timestamp={data?.timestamp} system={data?.system} />
      </div>
    </div>
  );
}
