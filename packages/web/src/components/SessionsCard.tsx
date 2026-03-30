import { fmtTokens, timeAgo, detectChannel, formatChannelLabel } from '../lib/format';
import { buildSessionDisplay } from '../lib/dashboard-presenters';
import type { AutomationSnapshot, ResourceState, SessionItem } from '../lib/types';
import { CardStateNotice } from './CardStateNotice';

interface SessionsCardProps {
  sessions: SessionItem[];
  automation?: AutomationSnapshot | null;
  state: ResourceState;
  onRetry?: () => void;
}

export function SessionsCard({ sessions, automation, state, onRetry }: SessionsCardProps) {
  const sorted = [...sessions].sort(compareSessionPriority);
  const hotSessions = sorted.filter((session) => (session.age ?? Number.POSITIVE_INFINITY) <= 15 * 60 * 1000).length;
  const riskySessions = sorted.filter((session) => (session.percentUsed ?? 0) >= 75).length;
  const hasSnapshot = state.updatedAt != null || state.status === 'ready' || sorted.length > 0;
  const badgeLabel = !hasSnapshot && state.status === 'loading' ? '同步中' : String(sorted.length);

  return (
    <div className="card card-sessions">
      <div className="card-header">
        <span className="card-icon">🔗</span>
        <span className="card-title">会话工作台</span>
        <span className={`badge${hotSessions > 0 && hasSnapshot ? ' pulse' : ''}`}>{badgeLabel}</span>
      </div>
      <div className="card-body">
        {!hasSnapshot && state.status === 'loading' ? (
          <CardStateNotice
            tone="loading"
            title="正在同步会话工作台"
            detail="会话热度、上下文压力和渠道分布会在首轮快照后补齐。"
          />
        ) : !hasSnapshot && state.status === 'error' ? (
          <CardStateNotice
            tone="error"
            title="会话工作台暂不可用"
            detail={state.error ?? '核心指标请求失败'}
            onRetry={onRetry}
          />
        ) : (
          <>
            <div className="session-summary-strip">
              <span>活跃 {hotSessions}</span>
              <span>高 ctx {riskySessions}</span>
              <span>总会话 {sorted.length}</span>
            </div>
            {hasSnapshot && state.status === 'loading' ? (
              <CardStateNotice tone="loading" compact title="正在刷新会话快照" />
            ) : null}
            {hasSnapshot && state.status === 'error' ? (
              <CardStateNotice
                tone="warning"
                compact
                title="当前展示最近一次成功快照"
                detail={state.error ?? '会话快照刷新失败'}
                onRetry={onRetry}
              />
            ) : null}
            <div className="session-list">
              {sorted.length === 0 ? (
                <div className="empty">当前没有会话</div>
              ) : (
                sorted.map((session) => (
                  <SessionRow
                    key={session.key}
                    session={session}
                    automation={automation}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SessionRow({ session: s, automation }: { session: SessionItem; automation?: AutomationSnapshot | null }) {
  const ch = detectChannel(s.key);
  const display = buildSessionDisplay(s, automation);
  const pct = s.percentUsed ?? 0;
  const ctxColor = pct > 70 ? 'var(--danger-strong)' : pct > 40 ? 'var(--warn-strong)' : 'var(--accent-strong)';
  const signals = getSessionSignals(s);

  return (
    <div className={`session-item${signals.some((signal) => signal.level === 'warning') ? ' is-risky' : ''}`}>
      <div className="session-main-row">
        <span className={`session-channel ${ch}`}>{formatChannelLabel(ch)}</span>
        <span className="session-key" title={display.technicalKey}>{display.displayName}</span>
        <span className={`session-project session-project-${display.level}`}>{display.projectLabel}</span>
        <span className="session-tokens">{fmtTokens(s.totalTokens)}</span>
        <div className="ctx-bar">
          <div className="ctx-bar-fill" style={{ width: `${pct}%`, background: ctxColor }} />
        </div>
        <span className="session-pct" style={{ color: ctxColor }}>{pct}%</span>
        <span className="session-time">{timeAgo(s.age)}</span>
      </div>
      {signals.length > 0 ? (
        <div className="session-risk-list">
          {signals.map((signal) => (
            <span key={signal.label} className={`session-risk-pill tone-${signal.level === 'warning' ? 'danger' : 'good'}`}>
              {signal.label}
            </span>
          ))}
        </div>
      ) : null}
      <div className="session-note" title={`${display.note} · ${display.technicalKey}`}>
        {display.note} · 技术标识 {display.shortTechnicalKey}
      </div>
    </div>
  );
}

function getSessionSignals(session: SessionItem): Array<{ label: string; level: 'warning' | 'info' }> {
  const signals: Array<{ label: string; level: 'warning' | 'info' }> = [];

  if ((session.percentUsed ?? 0) >= 75) {
    signals.push({ label: '高 ctx', level: 'warning' });
  }

  if ((session.totalTokens ?? 0) >= 120_000) {
    signals.push({ label: '高 token', level: 'warning' });
  }

  if ((session.age ?? Number.MAX_SAFE_INTEGER) <= 15 * 60 * 1000) {
    signals.push({ label: '活跃中', level: 'info' });
  }

  return signals;
}

function compareSessionPriority(a: SessionItem, b: SessionItem): number {
  const scoreDelta = sessionScore(b) - sessionScore(a);
  if (scoreDelta !== 0) return scoreDelta;
  return (a.age ?? Number.POSITIVE_INFINITY) - (b.age ?? Number.POSITIVE_INFINITY);
}

function sessionScore(session: SessionItem): number {
  let score = 0;
  score += (session.percentUsed ?? 0) * 2;
  score += Math.min(60, (session.totalTokens ?? 0) / 5000);
  if ((session.age ?? Number.POSITIVE_INFINITY) <= 15 * 60 * 1000) score += 40;
  return score;
}
