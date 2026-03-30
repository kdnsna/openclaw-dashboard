import type { OfficialDashboardInfo, ResourceState } from '../lib/types';
import { CardStateNotice } from './CardStateNotice';

interface OfficialDashboardLinksCardProps {
  info?: OfficialDashboardInfo | null;
  state: ResourceState;
  onRetry?: () => void;
}

export function OfficialDashboardLinksCard({ info, state, onRetry }: OfficialDashboardLinksCardProps) {
  const host = typeof window === 'undefined' ? '127.0.0.1' : window.location.hostname;
  const protocol = typeof window === 'undefined' ? 'http:' : window.location.protocol;
  const baseUrl = info ? `${protocol}//${host}:${info.port}` : null;
  const hasSnapshot = Boolean(info && baseUrl);
  const currentInfo = info ?? null;

  return (
    <div className="card card-official-links">
      <div className="card-header">
        <span className="card-icon">🧭</span>
        <span className="card-title">官方 Dashboard 入口</span>
      </div>
      <div className="card-body">
        {!hasSnapshot && state.status === 'loading' ? (
          <CardStateNotice
            tone="loading"
            title="正在同步官方入口"
            detail="官方 Dashboard 端口和入口清单会随核心指标一并返回。"
          />
        ) : !hasSnapshot && state.status === 'error' ? (
          <CardStateNotice
            tone="error"
            title="官方 Dashboard 入口暂不可用"
            detail={state.error ?? '核心指标请求失败'}
            onRetry={onRetry}
          />
        ) : (
          <>
            {hasSnapshot && state.status === 'loading' ? (
              <CardStateNotice tone="loading" compact title="正在刷新入口清单" />
            ) : null}
            {hasSnapshot && state.status === 'error' ? (
              <CardStateNotice
                tone="warning"
                compact
                title="当前展示最近一次成功快照"
                detail={state.error ?? '入口清单刷新失败'}
                onRetry={onRetry}
              />
            ) : null}
            <div className="summary-note">
              小锤子监控台负责运营概览和检修入口，底层系统详情、原厂诊断和原始 sessions 详情请进入官方 Dashboard。
            </div>
            <div className="official-link-list">
              {currentInfo?.links.map((link) => (
                <a
                  key={link.id}
                  className="official-link-item"
                  href={`${baseUrl}${link.path}`}
                  target="_blank"
                  rel="noreferrer"
                  title={`${link.label} · ${link.description} · ${link.path}`}
                >
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
