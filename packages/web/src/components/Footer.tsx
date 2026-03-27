import type { SystemSnapshot } from '../lib/types';

interface FooterProps {
  timestamp?: number;
  system?: SystemSnapshot;
}

function formatPercent(value?: number): string {
  return value == null ? '--' : `${Math.round(value)}%`;
}

export function Footer({ timestamp, system }: FooterProps) {
  const updated = timestamp
    ? '最近更新时间：' + new Date(timestamp).toLocaleTimeString('zh-CN')
    : '最近更新时间：--';

  return (
    <footer className="footer">
      <div className="footer-brand">
        <span className="footer-title">小锤子监控台</span>
        <span className="footer-subtitle">AI / OpenClaw workspace monitor</span>
      </div>
      <div className="footer-meta">
        <span>{updated}</span>
        <span>CPU {formatPercent(system?.cpuPercent)} · 内存占用 {formatPercent(system?.memPercent)}</span>
      </div>
    </footer>
  );
}
