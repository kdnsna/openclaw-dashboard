import { fmtTokens, timeAgo, detectChannel, formatChannelLabel } from '../lib/format';
import { getSessionMeta } from '../lib/sessionMeta';
import type { SessionItem } from '../lib/types';

interface SessionsCardProps {
  sessions: SessionItem[];
}

export function SessionsCard({ sessions }: SessionsCardProps) {
  return (
    <div className="card card-sessions">
      <div className="card-header">
        <span className="card-icon">🔗</span>
        <span className="card-title">近期会话</span>
        <span className="badge">{sessions.length}</span>
      </div>
      <div className="card-body">
        <div className="session-list">
          {sessions.length === 0 ? (
            <div className="empty">当前没有会话</div>
          ) : (
            sessions.map((s) => <SessionRow key={s.key} session={s} />)
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
  const ctxColor = pct > 70 ? '#ff3366' : pct > 40 ? '#ffcc00' : '#00f0ff';

  return (
    <div className="session-item">
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
      <div className="session-note" title={meta.note}>{meta.note}</div>
    </div>
  );
}
