import { useClock } from '../hooks/useClock';
import type {
  DashboardBootState,
  DashboardMetrics,
  ChannelHealth,
  ResourceStates,
} from '../lib/types';
import type { WsStatus } from '../hooks/useMetrics';
import { APP_VERSION } from '../lib/appVersion';
import { listUnavailableResources } from '../lib/resource-state-copy';
import { BrandMarkIcon } from './BrandMarkIcon';
import { HeaderStatusGroup } from './HeaderStatusGroup';

interface HeaderProps {
  data: DashboardMetrics | null;
  bootState: DashboardBootState;
  resourceStates: ResourceStates;
  wsStatus: WsStatus;
  isCollapsed?: boolean;
}

export function Header({ data, bootState, resourceStates, wsStatus, isCollapsed = false }: HeaderProps) {
  const clock = useClock();

  const health = data?.health;
  const status = data?.status;
  const presence = data?.presence ?? [];
  const stats = data?.activity?.stats;
  const sessions = status?.sessions?.recent ?? [];

  const unavailableResources = listUnavailableResources(resourceStates);

  let healthClass = 'disconnected';
  let healthLabel = '等待数据';
  if (bootState === 'booting') {
    healthClass = 'degraded';
    healthLabel = '首轮同步中';
  } else if (bootState === 'degraded') {
    healthClass = 'degraded';
    healthLabel = unavailableResources.length > 0 ? '部分降级' : '同步波动';
  } else if (health) {
    healthClass = health.ok ? 'healthy' : 'degraded';
    healthLabel = health.ok ? '健康' : '降级';
  } else if (wsStatus === 'offline') {
    healthClass = 'disconnected';
    healthLabel = '离线';
  }

  const subtitle =
    bootState === 'booting'
      ? '正在连接监控源并同步首轮快照'
      : bootState === 'degraded'
        ? `部分数据暂未到位：${unavailableResources.join(' / ') || '请稍后重试'}`
        : wsStatus === 'connecting'
          ? '实时链路重连中，当前展示最近一次快照'
          : 'OpenClaw / ACP / 自动化总览';

  const channelItems = Object.entries(health?.channels ?? {}).map(([name, ch]) => {
    const { probe, configured } = ch as ChannelHealth;
    const ok = probe?.ok || configured;
    const label = health?.channelLabels?.[name] ?? name;

    return {
      key: name,
      label,
      tone: ok ? ('ok' as const) : ('error' as const),
    };
  });

  const activePresence = presence.filter((p) => p.reason !== 'disconnect');
  const shownPresence = activePresence.length > 0 ? activePresence : presence;
  const deviceItems = shownPresence.map((p, i) => {
    const isActive = p.reason !== 'disconnect';
    const label = p.host || p.deviceId?.slice(0, 12) || '?';

    return {
      key: p.deviceId ?? `${label}-${i}`,
      label,
      tone: isActive ? ('active' as const) : ('inactive' as const),
    };
  });

  const healthyChannels = channelItems.filter((item) => item.tone === 'ok').length;
  const onlineDevices = deviceItems.filter((item) => item.tone === 'active').length;
  const compactSummary = [
    {
      key: 'channels',
      label: channelItems.length > 0 ? `通道 ${healthyChannels}/${channelItems.length}` : '通道 暂无',
      tone: channelItems.length > 0 && healthyChannels === channelItems.length ? ('ok' as const) : ('inactive' as const),
    },
    {
      key: 'devices',
      label: deviceItems.length > 0 ? `设备 ${onlineDevices}/${deviceItems.length}` : '设备 暂无',
      tone: onlineDevices > 0 ? ('active' as const) : ('inactive' as const),
    },
    {
      key: 'sessions',
      label: `会话 ${sessions.length}`,
      tone: sessions.length > 0 ? ('active' as const) : ('inactive' as const),
    },
  ];

  return (
    <header className={`header${isCollapsed ? ' is-collapsed' : ''}`}>
      <div className="header-main">
        <div className="header-left">
          <span className="logo-mark" aria-hidden="true">
            <BrandMarkIcon className="logo-mark-icon" />
          </span>
          <div className="header-brand">
            <span className="header-kicker">HAMMER WATCH / AI OPS</span>
            <h1>小锤子监控台</h1>
            <span className="header-subtitle" title={subtitle}>{subtitle}</span>
          </div>
          <span className="version">v{APP_VERSION}</span>
        </div>
        <div className="header-right">
          <div className={`status-indicator ${healthClass}`}>
            <span className="dot" />
            <span className="label">{healthLabel}</span>
          </div>
          <div className="clock">{clock}</div>
        </div>
      </div>
      <div className="header-rail">
        <div className="live-counters">
          <div className="counter">
            <span className="counter-value">{stats?.messages ?? 0}</span>
            <span className="counter-label">消息</span>
          </div>
          <div className="counter">
            <span className="counter-value">{stats?.toolCalls ?? 0}</span>
            <span className="counter-label">工具调用</span>
          </div>
          <div className="counter">
            <span className="counter-value">{sessions.length}</span>
            <span className="counter-label">活跃会话</span>
          </div>
        </div>
        <div className="header-mid">
          <HeaderStatusGroup items={channelItems} emptyLabel="暂无通道" title="通道" />
          <HeaderStatusGroup items={deviceItems} emptyLabel="暂无设备" title="设备" />
        </div>
      </div>
      <div className="header-compact-strip" aria-hidden={!isCollapsed}>
        {compactSummary.map((item) => (
          <span
            key={item.key}
            className={`header-compact-item${item.key === 'sessions' ? ' is-secondary' : ''}`}
            title={item.label}
          >
            <span className={`inline-dot ${item.tone}`} />
            <span className="inline-name">{item.label}</span>
          </span>
        ))}
      </div>
    </header>
  );
}
