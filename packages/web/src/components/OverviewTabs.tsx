export type DashboardView = 'overview' | 'inspect';

interface OverviewTabsProps {
  value: DashboardView;
  onChange: (next: DashboardView) => void;
  compact?: boolean;
}

export function OverviewTabs({ value, onChange, compact = false }: OverviewTabsProps) {
  return (
    <div className={`view-tabs${compact ? ' is-compact' : ''}`} role="tablist" aria-label="监控台视图切换">
      <button
        type="button"
        className={`view-tab${value === 'overview' ? ' active' : ''}`}
        onClick={() => onChange('overview')}
      >
        <span className="view-tab-kicker">Overview</span>
        <span className="view-tab-title">总览</span>
        <span className="view-tab-subtitle">日常运营面</span>
      </button>
      <button
        type="button"
        className={`view-tab${value === 'inspect' ? ' active' : ''}`}
        onClick={() => onChange('inspect')}
      >
        <span className="view-tab-kicker">Inspect</span>
        <span className="view-tab-title">检修</span>
        <span className="view-tab-subtitle">会话、任务与 ACP 深查</span>
      </button>
    </div>
  );
}
