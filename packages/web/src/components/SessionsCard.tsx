import { fmtTokens, timeAgo, detectChannel, formatChannelLabel } from '../lib/format';
import { getSessionMeta } from '../lib/sessionMeta';
import type { SessionItem } from '../lib/types';

interface SessionsCardProps {
  sessions: SessionItem[];
}

export function SessionsCard({ sessions }: SessionsCardProps) {
  const sorted = [...sessions].sort(compareSessionPriority);
  const hotSessions = sorted.filter((session) => (session.age ?? Number.POSITIVE_INFINITY) <= 15 * 60 * 1000).length;
  const riskySessions = sorted.filter((session) => (session.percentUsed ?? 0) >= 75).length;

  return (
    <div className="card card-sessions">
      <div className="card-header">
        <span className="card-icon">🔗</span>
        <span className="card-title">会话工作台</span>
        <span className={`badge${hotSessions > 0 ? ' pulse' : ''}`}>{sorted.length}</span>
      </div>
      <div className="card-body">
        <div className="session-summary-strip">
          <span>活跃 {hotSessions}</span>
          <span>高 ctx {riskySessions}</span>
          <span>总会话 {sorted.length}</span>
        </div>
        <div className="session-list">
          {sorted.length === 0 ? (
            <div className="empty">当前没有会话</div>
          ) : (
            sorted.map((s) => <SessionRow key={s.key} session={s} />)
          )}
        </div>
      </div>
    </div>
  );
}

function SessionRow({ session: s }: { session: SessionItem }) {
  const ch = detectChannel(s.key);
  const meta = getSessionMeta(s);
  const pct = s.percentUsed ?? 0;
  const ctxColor = pct > 70 ? 'var(--danger-strong)' : pct > 40 ? 'var(--warn-strong)' : 'var(--accent-strong)';
  const signals = getSessionSignals(s);

  return (
    <div className={`session-item${signals.some((signal) => signal.level === 'warning') ? ' is-risky' : ''}`}>
      <div className="session-main-row">
        <span className={`session-channel ${ch}`}>{formatChannelLabel(ch)}</span>
        <span className="session-key" title={s.key}>{meta.shortKey}</span>
        <span className={`session-project session-project-${meta.level}`}>{meta.project}</span>
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
      <div className="session-note" title={meta.note}>{meta.note}</div>
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
