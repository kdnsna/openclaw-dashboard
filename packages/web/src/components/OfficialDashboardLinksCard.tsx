import type { OfficialDashboardInfo } from '../lib/types';

interface OfficialDashboardLinksCardProps {
  info?: OfficialDashboardInfo | null;
}

export function OfficialDashboardLinksCard({ info }: OfficialDashboardLinksCardProps) {
  const host = typeof window === 'undefined' ? '127.0.0.1' : window.location.hostname;
  const protocol = typeof window === 'undefined' ? 'http:' : window.location.protocol;
  const baseUrl = info ? `${protocol}//${host}:${info.port}` : null;

  return (
    <div className="card card-official-links">
      <div className="card-header">
        <span className="card-icon">🧭</span>
        <span className="card-title">官方 Dashboard 入口</span>
      </div>
      <div className="card-body">
        {!info || !baseUrl ? (
          <div className="empty">官方 Dashboard 入口暂不可用</div>
        ) : (
          <>
            <div className="summary-note">
              小锤子监控台负责运营概览和检修入口，底层系统详情、原厂诊断和原始 sessions 详情请进入官方 Dashboard。
            </div>
            <div className="official-link-list">
              {info.links.map((link) => (
                <a key={link.id} className="official-link-item" href={`${baseUrl}${link.path}`} target="_blank" rel="noreferrer">
                  <span className="official-link-title">{link.label}</span>
                  <span className="official-link-desc">{link.description}</span>
                  <span className="official-link-url">{link.path}</span>
                </a>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
