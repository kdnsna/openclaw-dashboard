interface CardStateNoticeProps {
  tone: 'loading' | 'warning' | 'error';
  title: string;
  detail?: string;
  onRetry?: () => void;
  compact?: boolean;
}

export function CardStateNotice({
  tone,
  title,
  detail,
  onRetry,
  compact = false,
}: CardStateNoticeProps) {
  return (
    <div className={`card-state card-state-${tone}${compact ? ' is-compact' : ''}`}>
      <div className="card-state-copy">
        <div className="card-state-title">{title}</div>
        {detail ? <div className="card-state-detail">{detail}</div> : null}
      </div>
      {onRetry ? (
        <button type="button" className="card-state-action" onClick={onRetry}>
          重试
        </button>
      ) : null}
    </div>
  );
}
