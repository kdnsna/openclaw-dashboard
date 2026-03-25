export type DashboardView = 'overview' | 'inspect';

interface OverviewTabsProps {
  value: DashboardView;
  onChange: (next: DashboardView) => void;
}

export function OverviewTabs({ value, onChange }: OverviewTabsProps) {
  return (
    <div className="view-tabs" role="tablist" aria-label="监控台视图切换">
      <button
        type="button"
        className={`view-tab${value === 'overview' ? ' active' : ''}`}
        onClick={() => onChange('overview')}
      >
        <span className="view-tab-title">总览</span>
        <span className="view-tab-subtitle">日常运营驾驶舱</span>
      </button>
      <button
        type="button"
        className={`view-tab${value === 'inspect' ? ' active' : ''}`}
        onClick={() => onChange('inspect')}
      >
        <span className="view-tab-title">检修</span>
        <span className="view-tab-subtitle">会话、任务、活动流与 ACP 深查</span>
      </button>
    </div>
  );
}
