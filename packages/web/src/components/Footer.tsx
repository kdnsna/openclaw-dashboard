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
      <span>🦞 小锤子监控台</span>
      <span>{updated}</span>
      <span style={{ color: 'var(--text2)' }}>
        CPU {formatPercent(system?.cpuPercent)} · 内存占用 {formatPercent(system?.memPercent)}
      </span>
    </footer>
  );
}
