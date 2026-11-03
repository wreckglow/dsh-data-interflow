window.__ModuleLoader__.load({
  id: '@local/dsh-interflow',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    const NS = 'dsh-interflow';
    const PANEL_ID = 'interflow';
    const POLL_MS = 2500;
    const KINDS = ['note', 'alert', 'question', 'answer', 'handoff', 'request'];

    const inject = ['slots', 'locale'];

    const zh = {
      panel: '互通',
      title: 'DSH 互通',
      subtitle: '在多个 DSH 实例之间互发消息。每个实例各自保存消息，离线时也能在恢复后补收。',
      'hero.eyebrow': 'DSH MESH',
      'hero.unread': '条未读消息',
      'hero.allRead': '全部已读',
      'hero.unreadHint': '等待处理',
      'hero.readyHint': '消息已同步',
      'stat.peers': '节点',
      'stat.online': '在线',
      'stat.messages': '消息',
      'stat.sync': '最近同步',
      'stat.never': '尚未同步',
      'tab.inbox': '消息流',
      'tab.peers': '节点',
      'compose.title': '发送消息',
      'compose.to': '发往',
      'compose.kind': '类型',
      'compose.broadcast': '所有节点',
      'compose.subject': '主题',
      'compose.subjectPlaceholder': '例如：请接手这个任务',
      'compose.body': '内容',
      'compose.bodyPlaceholder': '写下要通知另一个 DSH 的内容…',
      'compose.send': '发送',
      'compose.sending': '发送中…',
      'compose.sent': '已发送，等待节点同步。',
      'compose.reply': '回复',
      'compose.replying': '正在回复 {id}',
      'compose.cancelReply': '取消回复',
      'compose.hint': '⌘ / Ctrl + Enter 发送',
      'compose.requestHint': '发送后，对方会创建一个会话执行，并把结果作为回复发回。',
      'request.pending': '等待回复',
      'request.answered': '已回复',
      'request.replyTo': '回复请求',
      'inbox.mine': '发给我的',
      'inbox.all': '全部消息',
      'inbox.markAll': '全部已读',
      'inbox.none': '没有符合条件的消息。',
      'inbox.showMore': '展开',
      'inbox.showLess': '收起',
      'inbox.unread': '{count} 条未读',
      'inbox.markOne': '标记已读',
      'feed.emptyTitle': '这里还很安静',
      'feed.emptyHint': '连接一个节点，或从左侧发出第一条消息。',
      'feed.emptyPeers': '添加节点后，消息流会出现在这里。',
      'feed.filterHint': '切换到“全部消息”，可以看到其他节点之间的消息。',
      'feed.goPeers': '去添加节点',
      'map.title': '网络拓扑',
      'map.hint': '点击节点可设为发送目标',
      'map.selected': '已设为发送目标',
      'map.empty': '等待节点接入',
      'map.self': '本机',
      'peers.title': '互联节点',
      'peers.self': '当前实例',
      'peers.address': '地址',
      'peers.copy': '复制',
      'peers.copied': '已复制',
      'peers.copyFailed': '复制失败，请手动选中地址',
      'peers.add': '添加节点',
      'peers.addPanel': '接入新节点',
      'peers.listPanel': '节点列表',
      'peers.addHint': '在另一个 DSH 实例的“节点”页找到它的地址，填到这里。',
      'peers.label': '名称（可选）',
      'peers.url': '地址（http://主机:端口）',
      'peers.token': '共享令牌（可选）',
      'peers.addButton': '连接',
      'peers.adding': '连接中…',
      'peers.empty': '还没有节点。',
      'peers.remove': '移除',
      'peers.confirmRemove': '再次点击确认',
      'peers.sync': '立即同步',
      'peers.syncing': '同步中…',
      'peers.online': '在线',
      'peers.offline': '离线',
      'peers.onlineCount': '{online} / {total} 在线',
      'peers.lastSeen': '上次同步：{time}',
      'peers.never': '从未同步',
      'peers.neverShort': '未同步',
      'peers.error': '错误：{message}',
      'peers.listening': '正在监听',
      'peers.notListening': '未监听入站连接',
      'peers.outbound': '仅出站',
      'peers.mailbox': '信箱',
      'peers.member': '成员',
      'peers.hub': '信箱',
      'peers.executeOn': '可执行请求',
      'peers.executeOff': '仅收发消息',
      'peers.main': '主节点',
      'skills.title': '主节点能力',
      'skills.mainToggle': '设为主节点',
      'skills.mainToggleHint': '主节点的技能会广播给其他节点，其他节点可一键委派。',
      'skills.local': '本机主节点',
      'skills.remote': '主节点：{name}',
      'skills.none': '还没有主节点',
      'skills.noneHint': '在主节点配置里加 mainNode: true，重载后这里会显示它的技能。',
      'skills.empty': '主节点还没有可用技能。',
      'skills.delegate': '委派',
      'skills.delegated': '已填入请求，补充任务内容后发送。',
      'skills.localHint': '这些技能在本机；其他节点会通过主节点请求使用。',
      'skills.remoteHint': '委派会向主节点发一条执行请求，由它用本地技能执行。',
      'tasks.title': '多目标任务',
      'tasks.count': '{count} 个任务',
      'tasks.all': '所有已知节点',
      'tasks.subject': '任务主题',
      'tasks.body': '任务内容',
      'tasks.hint': '同一任务发给选中的每台设备，结果按设备汇总。',
      'tasks.run': '运行任务',
      'tasks.running': '运行中…',
      'tasks.started': '任务已发送，等待各节点回复。',
      'tasks.empty': '还没有多目标任务。',
      'tasks.noPeers': '先接入至少一个节点，才能运行多目标任务。',
      'tasks.waiting': '等待',
      'tasks.answered': '已回复',
      'tasks.timeout': '超时',
      'tasks.error': '失败',
      'tasks.done': '全部完成',
      'tasks.partial': '部分完成',
      'tasks.failed': '全部失败',
      'tasks.runningStatus': '运行中',
      'tasks.retry': '重试失败目标',
      'tasks.cancel': '取消等待',
      'tasks.retried': '已重试失败/超时目标。',
      'tasks.cancelled': '任务已取消等待。',
      'tasks.cancelledTarget': '已取消',
      'peers.mqttConnected': 'MQTT 已连接',
      'peers.mqttConnecting': 'MQTT 连接中',
      'peers.mqttError': 'MQTT 连接异常',
      'peers.mqttBroker': 'MQTT Broker',
      'peers.mqttRoom': 'MQTT 房间',
      'mqtt.title': 'MQTT 中继（跨网络）',
      'mqtt.nodeName': '节点名称',
      'mqtt.nodeNameHint': '建议唯一，例如 android / watch / home-server；发送和执行请求时用它选目标。',
      'mqtt.hint': '三台设备连同一个免费 broker，不需要公网 IP；消息端到端加密。三台要填同一个房间名和密钥。',
      'mqtt.broker': 'Broker 地址',
      'mqtt.room': '房间名（三台一致）',
      'mqtt.secret': '共享密钥',
      'mqtt.secretKeep': '留空沿用已保存的密钥',
      'mqtt.secretPlaceholder': '强随机共享密钥',
      'mqtt.secretRequired': '必填：三台设备必须使用同一个共享密钥；它用于消息端到端加密，不是 broker 密码。',
      'mqtt.secretSet': '已保存密钥；留空则沿用',
      'mqtt.username': 'Broker 用户名（可选）',
      'mqtt.password': 'Broker 密码（可选）',
      'mqtt.enable': '启用 MQTT 中继',
      'mqtt.save': '保存并重连',
      'mqtt.saving': '保存中…',
      'mqtt.disable': '切回 HTTP',
      'mqtt.saved': '传输配置已保存，正在切换。',
      'mqtt.off': '未启用',
      'hero.pending': '{count} 个待回复',
      'role.peer': '对等节点',
      'role.hub': '信箱',
      'role.spoke': '出站节点',
      'role.mqtt': 'MQTT 中继',
      'peers.loopbackHint': '只监听本机回环地址。跨机器互连时，把配置里的 listenHost 改为 0.0.0.0 并设置 token。',
      'peers.tokenSet': '共享令牌',
      'peers.tokenUnset': '仅本机',
      'peers.relayOn': '中转开启',
      'peers.relayOff': '直接投递',
      'peers.dataDir': '数据目录',
      'peers.peerCount': '{count} 个节点',
      'setup.title': '把第二个 DSH 接进来',
      'setup.one': '在另一个 DSH 里也安装并启用这个插件。',
      'setup.two': '在它的“节点”页复制“当前实例”的地址。',
      'setup.three': '把地址填到这里的“添加节点”；跨机器时两边使用同一个 token。',
      'setup.four': '回到“消息流”发一条消息试试。',
      'setup.cta': '添加第一个节点',
      'kind.note': '便条',
      'kind.alert': '提醒',
      'kind.question': '提问',
      'kind.answer': '回答',
      'kind.handoff': '交接',
      'kind.request': '执行请求',
      'time.now': '刚刚',
      'time.minute': '{count} 分钟前',
      'time.hour': '{count} 小时前',
      'status.retry': '重试',
      'badge.unread': '{count} 条未读',
      'badge.title': 'DSH 互通',
    };

    const en = {
      panel: 'Interflow',
      title: 'DSH Interflow',
      subtitle: 'Message other DSH instances directly. Every instance keeps its own log, so an offline peer catches up when it returns.',
      'hero.eyebrow': 'DSH MESH',
      'hero.unread': 'unread messages',
      'hero.allRead': 'all caught up',
      'hero.unreadHint': 'waiting for you',
      'hero.readyHint': 'synced',
      'stat.peers': 'Peers',
      'stat.online': 'Online',
      'stat.messages': 'Messages',
      'stat.sync': 'Last sync',
      'stat.never': 'Never',
      'tab.inbox': 'Activity',
      'tab.peers': 'Peers',
      'compose.title': 'Compose',
      'compose.to': 'To',
      'compose.kind': 'Kind',
      'compose.broadcast': 'All peers',
      'compose.subject': 'Subject',
      'compose.subjectPlaceholder': 'For example: please take over this task',
      'compose.body': 'Message',
      'compose.bodyPlaceholder': 'Write what the other DSH instance should know…',
      'compose.send': 'Send',
      'compose.sending': 'Sending…',
      'compose.sent': 'Sent; waiting for peers to sync.',
      'compose.reply': 'Reply',
      'compose.replying': 'Replying to {id}',
      'compose.cancelReply': 'Cancel reply',
      'compose.hint': '⌘ / Ctrl + Enter to send',
      'compose.requestHint': 'The target creates a session, executes the task, and answers with the result.',
      'request.pending': 'Awaiting reply',
      'request.answered': 'Answered',
      'request.replyTo': 'Reply to request',
      'inbox.mine': 'Addressed to me',
      'inbox.all': 'All messages',
      'inbox.markAll': 'Mark all read',
      'inbox.none': 'No matching messages.',
      'inbox.showMore': 'Show more',
      'inbox.showLess': 'Show less',
      'inbox.unread': '{count} unread',
      'inbox.markOne': 'Mark read',
      'feed.emptyTitle': 'Nothing here yet',
      'feed.emptyHint': 'Connect a peer, or send the first message from the left.',
      'feed.emptyPeers': 'Messages appear here once a peer is connected.',
      'feed.filterHint': 'Switch to All messages to see traffic between other nodes.',
      'feed.goPeers': 'Connect a peer',
      'map.title': 'Network',
      'map.hint': 'Click a node to target it',
      'map.selected': 'Target selected',
      'map.empty': 'Waiting for peers',
      'map.self': 'THIS NODE',
      'peers.title': 'Peer connections',
      'peers.self': 'This instance',
      'peers.address': 'Address',
      'peers.copy': 'Copy',
      'peers.copied': 'Copied',
      'peers.copyFailed': 'Copy failed; select the address manually',
      'peers.add': 'Add a peer',
      'peers.addPanel': 'Connect a new node',
      'peers.listPanel': 'Peers',
      'peers.addHint': "Find the other instance's address in its Peers tab and add it here.",
      'peers.label': 'Label (optional)',
      'peers.url': 'Address (http://host:port)',
      'peers.token': 'Shared token (optional)',
      'peers.addButton': 'Connect',
      'peers.adding': 'Connecting…',
      'peers.empty': 'No peers yet.',
      'peers.remove': 'Remove',
      'peers.confirmRemove': 'Click again to confirm',
      'peers.sync': 'Sync now',
      'peers.syncing': 'Syncing…',
      'peers.online': 'Online',
      'peers.offline': 'Offline',
      'peers.onlineCount': '{online} / {total} online',
      'peers.lastSeen': 'Last sync: {time}',
      'peers.never': 'Never synced',
      'peers.neverShort': 'Never',
      'peers.error': 'Error: {message}',
      'peers.listening': 'Listening',
      'peers.notListening': 'Not accepting inbound connections',
      'peers.outbound': 'Outbound only',
      'peers.mailbox': 'Mailbox',
      'peers.member': 'Member',
      'peers.hub': 'Mailbox',
      'peers.executeOn': 'Executes requests',
      'peers.executeOff': 'Messages only',
      'peers.main': 'main',
      'skills.title': 'Main node skills',
      'skills.mainToggle': 'Set as main node',
      'skills.mainToggleHint': 'The main node advertises its skills to other nodes, which can delegate with one click.',
      'skills.local': 'This node is the main',
      'skills.remote': 'Main: {name}',
      'skills.none': 'No main node yet',
      'skills.noneHint': 'Set mainNode: true on the main node and reload; its skills will appear here.',
      'skills.empty': 'The main node advertises no skills yet.',
      'skills.delegate': 'Delegate',
      'skills.delegated': 'Request drafted; add the task and send.',
      'skills.localHint': 'These skills live here; other nodes use them by asking this node.',
      'skills.remoteHint': 'Delegating sends a request to the main node, which runs its local skill.',
      'tasks.title': 'Multi-target tasks',
      'tasks.count': '{count} tasks',
      'tasks.all': 'All known nodes',
      'tasks.subject': 'Task subject',
      'tasks.body': 'Task body',
      'tasks.hint': 'The same task goes to every selected device; results are grouped by device.',
      'tasks.run': 'Run task',
      'tasks.running': 'Running…',
      'tasks.started': 'Task sent; waiting for replies.',
      'tasks.empty': 'No multi-target tasks yet.',
      'tasks.noPeers': 'Connect at least one node before running a multi-target task.',
      'tasks.waiting': 'waiting',
      'tasks.answered': 'answered',
      'tasks.timeout': 'timeout',
      'tasks.error': 'error',
      'tasks.done': 'done',
      'tasks.partial': 'partial',
      'tasks.failed': 'failed',
      'tasks.runningStatus': 'running',
      'tasks.retry': 'Retry failed',
      'tasks.cancel': 'Cancel waiting',
      'tasks.retried': 'Retried failed or timed-out targets.',
      'tasks.cancelled': 'Task cancelled locally.',
      'tasks.cancelledTarget': 'cancelled',
      'peers.mqttConnected': 'MQTT connected',
      'peers.mqttConnecting': 'MQTT connecting',
      'peers.mqttError': 'MQTT error',
      'peers.mqttBroker': 'MQTT broker',
      'peers.mqttRoom': 'MQTT room',
      'mqtt.title': 'MQTT relay (cross-network)',
      'mqtt.nodeName': 'Node name',
      'mqtt.nodeNameHint': 'Keep it unique, e.g. android / watch / home-server; it is the target name for messages and requests.',
      'mqtt.hint': 'All devices use one free broker; no public IP needed. Payloads are end-to-end encrypted. Use the same room and secret everywhere.',
      'mqtt.broker': 'Broker URL',
      'mqtt.room': 'Room (same on every device)',
      'mqtt.secret': 'Shared secret',
      'mqtt.secretKeep': 'Leave blank to keep the saved secret',
      'mqtt.secretPlaceholder': 'Strong shared secret',
      'mqtt.secretRequired': 'Required: every device must use the same shared secret. It encrypts messages end to end; it is not the broker password.',
      'mqtt.secretSet': 'Secret saved; leave blank to keep it',
      'mqtt.username': 'Broker username (optional)',
      'mqtt.password': 'Broker password (optional)',
      'mqtt.enable': 'Enable MQTT relay',
      'mqtt.save': 'Save and reconnect',
      'mqtt.saving': 'Saving…',
      'mqtt.disable': 'Switch back to HTTP',
      'mqtt.saved': 'Transport saved; switching now.',
      'mqtt.off': 'Off',
      'hero.pending': '{count} awaiting reply',
      'role.peer': 'Peer',
      'role.hub': 'Mailbox',
      'role.spoke': 'Spoke',
      'role.mqtt': 'MQTT relay',
      'peers.loopbackHint': 'Listening on loopback only. To connect across machines, set listenHost to 0.0.0.0 and set a token.',
      'peers.tokenSet': 'Shared token',
      'peers.tokenUnset': 'Loopback only',
      'peers.relayOn': 'Relay on',
      'peers.relayOff': 'Direct only',
      'peers.dataDir': 'Data directory',
      'peers.peerCount': '{count} peers',
      'setup.title': 'Connect a second DSH',
      'setup.one': 'Install and enable this plugin in the other DSH instance too.',
      'setup.two': 'Copy its address from “This instance” on its Peers tab.',
      'setup.three': 'Add that address under “Add a peer” here; use the same token on both sides across machines.',
      'setup.four': 'Send a message from the Activity tab to try it.',
      'setup.cta': 'Add the first peer',
      'kind.note': 'Note',
      'kind.alert': 'Alert',
      'kind.question': 'Question',
      'kind.answer': 'Answer',
      'kind.handoff': 'Handoff',
      'kind.request': 'Request',
      'time.now': 'just now',
      'time.minute': '{count}m ago',
      'time.hour': '{count}h ago',
      'status.retry': 'Retry',
      'badge.unread': '{count} unread',
      'badge.title': 'DSH Interflow',
    };

    /**
     * Start the panel: dictionaries, the background poller that feeds the
     * sidebar badge, and the two slot registrations.
     * @param {object} ctx - Browser plugin context.
     */
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'interflow: dictionaries');
      const t = ctx.locale.bind(NS);
      const store = createStore();
      const rpc = (endpoint, payload, signal) => callHost(endpoint, payload, signal);
      const poller = createPoller(rpc, store);
      ctx.effect(() => {
        poller.start();
        return () => poller.stop();
      }, 'interflow: polling');

      ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
        name: 'sidebar.panellist',
        id: PANEL_ID,
        order: 12,
        locale: NS,
        label: () => t('panel'),
      }, createSidebarIcon(store, t)));

      ctx.slots.inject('main', () => ctx.slots.register({
        name: 'main',
        key: PANEL_ID,
        locale: NS,
        inject: () => ({
          store,
          t,
          rpc,
          refresh: () => poller.refresh(),
        }),
      }, InterflowPage));
    }

    /**
     * Call one host operation over the authenticated `/api` route.
     * @param {string} op - Operation name.
     * @param {object} payload - JSON payload.
     * @param {AbortSignal} [signal] - Cancellation.
     * @returns {Promise<any>} Operation value.
     */
    async function callHost(op, payload, signal) {
      const response = await fetch('api/interflow', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        body: JSON.stringify({ op, payload: payload || {} }),
        ...(signal === undefined ? {} : { signal }),
      });
      if (!response.ok) throw new Error(`interflow request failed: HTTP ${response.status}`);
      const result = await response.json();
      if (!result || result.ok !== true) {
        const error = new Error(result && result.error && result.error.message
          ? result.error.message
          : 'interflow request failed');
        error.code = result && result.error ? result.error.code : 'request_failed';
        throw error;
      }
      return result.value;
    }

    /**
     * Small snapshot store shared by the page and the sidebar badge.
     * @returns {object} Store.
     */
    function createStore() {
      let state = {
        status: 'loading',
        self: null,
        listen: null,
        peers: [],
        messages: [],
        unread: 0,
        cursor: undefined,
        lastSeq: 0,
        lastSync: null,
        requests: { outgoing: 0, incoming: 0, active: 0 },
        settings: null,
        error: null,
        updatedAt: 0,
      };
      const listeners = new Set();
      const notify = () => {
        for (const listener of listeners) listener();
      };
      return {
        get() {
          return state;
        },
        subscribe(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        applySnapshot(value) {
          const incoming = Array.isArray(value && value.messages) ? value.messages : [];
          let messages;
          if (!value || value.reset === true || state.cursor === undefined) {
            messages = incoming.slice();
          } else {
            messages = mergeMessages(state.messages, incoming);
          }
          if (messages.length > 500) messages = messages.slice(-500);
          state = {
            status: 'ready',
            self: (value && value.self) || state.self,
            listen: (value && value.listen) || state.listen,
            peers: value && Array.isArray(value.peers) ? value.peers : state.peers,
            messages,
            unread: value && typeof value.unread === 'number' ? value.unread : state.unread,
            cursor: value && typeof value.cursor === 'number' ? value.cursor : state.cursor,
            lastSeq: value && typeof value.lastSeq === 'number' ? value.lastSeq : state.lastSeq,
            lastSync: value && value.lastSync ? value.lastSync : state.lastSync,
            requests: value && value.requests ? value.requests : state.requests,
            settings: (value && value.settings) || state.settings,
            error: null,
            updatedAt: Date.now(),
          };
          notify();
        },
        setError(error) {
          state = {
            ...state,
            status: state.self ? 'ready' : 'error',
            error: error instanceof Error ? error.message : String(error),
          };
          notify();
        },
      };
    }

    /**
     * Merge two message pages by id.
     * @param {Array<object>} current - Known messages.
     * @param {Array<object>} incoming - New page.
     * @returns {Array<object>} Ascending by sequence.
     */
    function mergeMessages(current, incoming) {
      const byId = new Map();
      for (const message of current) byId.set(message.id, message);
      for (const message of incoming) byId.set(message.id, message);
      return [...byId.values()].sort((left, right) => left.seq - right.seq);
    }

    /**
     * Poll the host snapshot and expose a manual refresh.
     * @param {Function} rpc - Host caller.
     * @param {object} store - Snapshot store.
     * @returns {object} Poller.
     */
    function createPoller(rpc, store) {
      let stopped = false;
      let timer = null;
      let inflight = false;
      let queued = false;

      async function run(force) {
        if (stopped) return;
        if (inflight) {
          if (force) queued = true;
          return;
        }
        inflight = true;
        try {
          const state = store.get();
          const payload = force || state.cursor === undefined ? {} : { sinceSeq: state.cursor };
          const value = await rpc('snapshot', payload);
          if (!stopped) store.applySnapshot(value);
        } catch (error) {
          if (!stopped) store.setError(error);
        } finally {
          inflight = false;
        }
        if (queued) {
          queued = false;
          await run(true);
        }
      }

      function schedule() {
        if (stopped) return;
        timer = setTimeout(async () => {
          await run(false);
          schedule();
        }, POLL_MS);
      }

      return {
        start() {
          void run(true);
          schedule();
        },
        refresh() {
          return run(true);
        },
        stop() {
          stopped = true;
          if (timer) clearTimeout(timer);
        },
      };
    }

    /**
     * Subscribe a component to the store.
     * @param {object} store - Snapshot store.
     * @returns {object} Store snapshot.
     */
    function useSnapshot(store) {
      const [value, setValue] = React.useState(store.get());
      React.useEffect(() => store.subscribe(() => setValue(store.get())), [store]);
      return value;
    }

    /**
     * Localized relative time.
     * @param {string} iso - Timestamp.
     * @param {Function} t - Translate.
     * @returns {string} Relative time.
     */
    function relativeTime(iso, t) {
      const time = Date.parse(iso);
      if (!Number.isFinite(time)) return '';
      const diff = Date.now() - time;
      if (diff < 60000) return t('time.now');
      if (diff < 3600000) return t('time.minute', { count: Math.floor(diff / 60000) });
      if (diff < 86400000) return t('time.hour', { count: Math.floor(diff / 3600000) });
      return new Date(time).toLocaleDateString();
    }

    /**
     * Two-letter avatar initials.
     * @param {string} name - Display name.
     * @returns {string} Initials.
     */
    function initialsOf(name) {
      const text = String(name || '').trim();
      if (!text) return '?';
      const words = text.split(/\s+/).filter(Boolean);
      if (words.length >= 2) return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
      return text.slice(0, 2).toUpperCase();
    }

    /**
     * Stable tone index for one node identity.
     * @param {string} value - Node id or name.
     * @returns {number} Tone index 0-4.
     */
    function toneOf(value) {
      const text = String(value || '');
      let sum = 0;
      for (let index = 0; index < text.length; index += 1) sum += text.charCodeAt(index);
      return sum % 5;
    }

    /**
     * Truncate one label for a fixed-width surface.
     * @param {string} value - Text.
     * @param {number} max - Maximum characters.
     * @returns {string} Shortened text.
     */
    function truncate(value, max) {
      const text = String(value || '');
      return text.length > max ? `${text.slice(0, max - 1)}…` : text;
    }

    /**
     * Dot class for the listen pill.
     * @param {object|null} listen - Listen state.
     * @returns {string} Class suffix.
     */
    function listenDotClass(listen) {
      if (!listen) return '';
      if (listen.error) return 'bad';
      return listen.enabled ? 'on' : 'warn';
    }

    /**
     * Icon for the sidebar cell, with an unread dot.
     * @param {object} store - Snapshot store.
     * @param {Function} t - Translate.
     * @returns {Function} Component.
     */
    function createSidebarIcon(store, t) {
      return function InterflowIcon({ size }) {
        const snapshot = useSnapshot(store);
        const unread = snapshot.unread || 0;
        const edge = typeof size === 'number' && size > 0 ? size : 18;
        return h('span', {
          style: {
            position: 'relative',
            display: 'inline-flex',
            width: edge,
            height: edge,
            alignItems: 'center',
            justifyContent: 'center',
          },
          title: unread > 0 ? t('badge.unread', { count: unread }) : t('badge.title'),
        },
        h('svg', {
          width: edge,
          height: edge,
          viewBox: '0 0 16 16',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.35,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
          focusable: false,
        },
        h('path', { d: 'M5.1 5.4l5.8 5.2' }),
        h('circle', { cx: 4.1, cy: 4.4, r: 2.1 }),
        h('circle', { cx: 11.9, cy: 11.6, r: 2.1 }),
        h('circle', { cx: 11.6, cy: 4.4, r: 1.15 }),
        ),
        unread > 0
          ? h('span', {
            'aria-hidden': true,
            style: {
              position: 'absolute',
              top: -1.5,
              right: -1.5,
              width: 6.5,
              height: 6.5,
              borderRadius: '50%',
              background: 'var(--dsw-alias-brand-primary)',
              boxShadow: '0 0 0 1.5px var(--dsw-specific-sidebar-fill), 0 0 8px var(--dsw-alias-brand-primary)',
            },
          })
          : null);
      };
    }

    /**
     * The main Interflow panel.
     * @param {object} props - Injected store, translate, and host caller.
     * @returns {object} React element.
     */
    function InterflowPage({ store, t, rpc, refresh }) {
      const snapshot = useSnapshot(store);
      const [tab, setTab] = React.useState('inbox');
      const [scope, setScope] = React.useState('mine');
      const [notice, setNotice] = React.useState('');
      const [error, setError] = React.useState('');
      const [busy, setBusy] = React.useState('');
      const [copied, setCopied] = React.useState(false);
      const [draft, setDraft] = React.useState({ to: '*', kind: 'note', subject: '', body: '', replyTo: '' });
      const textareaRef = React.useRef(null);

      const peers = snapshot.peers || [];
      const messages = snapshot.messages || [];
      const online = peers.filter((peer) => peer.online).length;
      const visible = messages
        .filter((message) => (scope === 'all'
          ? true
          : (message.forMe && !message.mine) || (message.kind === 'request' && message.mine)))
        .slice()
        .sort((left, right) => right.seq - left.seq);

      const report = (value) => {
        setError('');
        setNotice(value);
        window.setTimeout(() => setNotice((current) => (current === value ? '' : current)), 4000);
      };

      const fail = (cause) => {
        setNotice('');
        setError(cause instanceof Error ? cause.message : String(cause));
      };

      const run = async (tag, operation) => {
        setBusy(tag);
        try {
          await operation();
        } catch (cause) {
          fail(cause);
          throw cause;
        } finally {
          setBusy('');
        }
      };

      const send = (next) => run('send', async () => {
        await rpc('send', {
          to: next.to,
          kind: next.kind,
          subject: next.subject,
          body: next.body,
          ...(next.replyTo ? { replyTo: next.replyTo } : {}),
        });
        setDraft({ to: next.to, kind: next.kind, subject: '', body: '', replyTo: '' });
        report(t('compose.sent'));
        await refresh();
      });

      const markRead = (id) => run('read', async () => {
        await rpc('markRead', { ids: [id] });
        await refresh();
      });

      const markAll = () => run('read', async () => {
        await rpc('markRead', { all: true });
        await refresh();
        report(t('inbox.markAll'));
      });

      const addPeer = (input) => run('add', async () => {
        await rpc('addPeer', input);
        await refresh();
        report(t('peers.add'));
      });

      const removePeer = (url) => run('remove', async () => {
        await rpc('removePeer', { url });
        await refresh();
        report(t('peers.remove'));
      });

      const syncNow = () => run('sync', async () => {
        await rpc('sync', {});
        await refresh();
        report(t('peers.sync'));
      });

      const configureTransport = (input) => run('transport', async () => {
        await rpc('configureTransport', input);
        await refresh();
        report(t('mqtt.saved'));
      });

      const runTask = (input) => run('run', async () => {
        const result = await rpc('run', input);
        await refresh();
        report(t('tasks.started'));
        return result;
      });

      const retryTask = (taskId) => run('retry', async () => {
        await rpc('retry', { taskId });
        await refresh();
        report(t('tasks.retried'));
      });

      const cancelTask = (taskId) => run('cancel', async () => {
        await rpc('cancel', { taskId });
        await refresh();
        report(t('tasks.cancelled'));
      });

      const copyAddress = async () => {
        const settings = snapshot.settings || {};
        const url = settings.transport === 'mqtt'
          ? (settings.mqttTopic || '')
          : settings.role === 'spoke'
            ? (settings.hubUrl || '')
            : (snapshot.listen && snapshot.listen.url ? snapshot.listen.url : '');
        if (!url) return;
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          fail(t('peers.copyFailed'));
        }
      };

      const reply = (message) => {
        setDraft({
          to: message.from.id,
          kind: message.kind === 'question' ? 'answer' : 'note',
          subject: /^Re:/i.test(message.subject) ? message.subject : `Re: ${message.subject}`,
          body: '',
          replyTo: message.id,
        });
        if (textareaRef.current && typeof textareaRef.current.focus === 'function') {
          textareaRef.current.focus();
        }
      };

      const selectPeer = (peer) => {
        setDraft({ ...draft, to: peer.nodeId || peer.url });
        setTab('inbox');
        report(t('map.selected'));
      };

      const delegate = (skill, main) => {
        if (!main || !skill) return;
        setDraft({
          to: main.nodeId || main.nodeName || main.label,
          kind: 'request',
          subject: `使用技能 ${skill.name}`,
          body: `请使用技能 ${skill.name} 执行：\n`,
          replyTo: '',
        });
        setTab('inbox');
        report(t('skills.delegated'));
        if (textareaRef.current && typeof textareaRef.current.focus === 'function') {
          textareaRef.current.focus();
        }
      };

      return h('div', { className: 'ifx-page' },
        h('style', null, CSS),
        h('div', { className: 'ifx-shell' },
          h(Hero, {
            t,
            snapshot,
            online,
            copied,
            onCopy: copyAddress,
          }),

          error
            ? h('div', { className: 'ifx-banner bad' },
              h('span', null, error),
              h('button', {
                className: 'ifx-btn ghost',
                onClick: () => {
                  setError('');
                  void refresh();
                },
              }, t('status.retry')),
            )
            : null,
          notice ? h('div', { className: 'ifx-banner ok' }, notice) : null,

          h(NetworkMapCard, { t, snapshot, draft, onSelectPeer: selectPeer }),

          h('div', { className: 'ifx-columns' },
            h('aside', { className: 'ifx-col-left' },
              h(ComposeCard, {
                t,
                draft,
                peers,
                disabled: busy === 'send',
                textareaRef,
                onChange: setDraft,
                onSend: (next) => send(next).catch(() => {}),
              }),
            ),
            h('section', { className: 'ifx-col-main' },
              h(FeedToolbar, {
                t,
                tab,
                setTab,
                scope,
                setScope,
                unread: snapshot.unread || 0,
                peerCount: peers.length,
                busy,
                onMarkAll: () => markAll().catch(() => {}),
                onSync: () => syncNow().catch(() => {}),
              }),
              tab === 'inbox'
                ? (visible.length > 0
                  ? h(ActivityFeed, {
                    t,
                    messages: visible,
                    busy,
                    onReply: reply,
                    onMarkRead: (id) => markRead(id).catch(() => {}),
                  })
                  : h(EmptyFeed, {
                    t,
                    hasPeers: peers.length > 0,
                    hasMessages: messages.length > 0,
                    onGoPeers: () => setTab('peers'),
                    onCompose: () => {
                      if (textareaRef.current && typeof textareaRef.current.focus === 'function') {
                        textareaRef.current.focus();
                      }
                    },
                  }))
                : h(PeersPanel, {
                  t,
                  snapshot,
                  busy,
                  onAdd: (input) => addPeer(input),
                  onRemove: (url) => removePeer(url),
                  onConfigure: (input) => configureTransport(input),
                  onDelegate: delegate,
                  onRun: (input) => runTask(input),
                  onRetry: (id) => retryTask(id),
                  onCancel: (id) => cancelTask(id),
                }),
            ),
          ),
        ),
      );
    }

    /**
     * Hero band: identity, address, live state, unread score, and stats.
     * @param {object} props - Snapshot and actions.
     * @returns {object} React element.
     */
    function Hero({ t, snapshot, online, copied, onCopy }) {
      const self = snapshot.self || { id: '', name: '', version: '' };
      const listen = snapshot.listen || { enabled: false, url: '', error: '' };
      const settings = snapshot.settings || {};
      const unread = snapshot.unread || 0;
      const peers = snapshot.peers || [];
      const transport = settings.transport || 'http';
      const role = transport === 'mqtt' ? 'mqtt' : (settings.role || 'peer');
      const hubPeer = peers.find((peer) => peer.kind === 'hub');
      const hubOnline = hubPeer ? hubPeer.online === true : false;
      const mqttConnected = settings.mqttStatus === 'connected';
      const live = transport === 'mqtt' ? mqttConnected : role === 'spoke' ? hubOnline : listen.enabled && !listen.error;
      const address = transport === 'mqtt'
        ? (settings.mqttTopic || '')
        : role === 'spoke'
          ? (settings.hubUrl || '')
          : (listen.url || '');
      const addressText = transport === 'mqtt'
        ? (settings.mqttTopic || t('peers.mqttRoom'))
        : role === 'spoke'
          ? (hubPeer && hubPeer.label ? hubPeer.label : (settings.hubUrl || t('peers.mailbox')))
          : (listen.url || t('peers.notListening'));
      const heroError = listen.error || settings.mqttError || settings.fatalError || settings.rpcError || '';
      return h('section', { className: 'ifx-hero' },
        h('div', { className: 'ifx-hero-grid' },
          h('div', { className: 'ifx-hero-main' },
            h('div', { className: 'ifx-eyebrow' },
              h('span', { className: `ifx-live ${live ? 'on' : ''}` }),
              t('hero.eyebrow'),
            ),
            h('h1', { className: 'ifx-title' }, t('title')),
            h('p', { className: 'ifx-hero-sub' }, t('subtitle')),
            h('div', { className: 'ifx-hero-meta' },
              h('button', {
                className: 'ifx-address',
                type: 'button',
                disabled: !address,
                onClick: onCopy,
                title: address || '',
              },
              h('span', { className: 'ifx-address-dot' }),
              h('span', { className: 'ifx-mono' }, addressText),
              h('span', { className: 'ifx-address-action' }, copied ? t('peers.copied') : t('peers.copy')),
              ),
              h('span', { className: `ifx-pill ${live ? 'on' : heroError ? 'bad' : 'warn'}` },
                h('span', { className: `ifx-dot ${live ? 'on' : heroError ? 'bad' : 'warn'}` }),
                transport === 'mqtt'
                  ? (mqttConnected ? t('peers.mqttConnected') : settings.mqttStatus === 'error' ? t('peers.mqttError') : t('peers.mqttConnecting'))
                  : role === 'spoke' ? t('peers.outbound') : listen.enabled ? t('peers.listening') : t('peers.notListening'),
              ),
              h('span', { className: 'ifx-pill' }, t(`role.${role}`)),
              transport === 'mqtt'
                ? h('span', { className: 'ifx-pill', title: settings.mqttUrl || '' }, settings.mqttUrl || t('peers.mqttBroker'))
                : null,
              h('span', { className: 'ifx-pill' }, settings.executeRequests ? t('peers.executeOn') : t('peers.executeOff')),
              h('span', { className: 'ifx-pill' }, settings.relay ? t('peers.relayOn') : t('peers.relayOff')),
              h('span', { className: 'ifx-pill' }, settings.tokenConfigured ? t('peers.tokenSet') : t('peers.tokenUnset')),
              snapshot.requests && (snapshot.requests.outgoing + snapshot.requests.incoming) > 0
                ? h('span', { className: 'ifx-pill ifx-unread-pill' }, t('hero.pending', { count: snapshot.requests.outgoing + snapshot.requests.incoming }))
                : null,
            ),
          ),
          h('div', { className: 'ifx-score' },
            h('div', { className: `ifx-score-number ${unread > 0 ? '' : 'zero'}` }, String(unread)),
            h('div', { className: 'ifx-score-label' }, unread > 0 ? t('hero.unread') : t('hero.allRead')),
            h('div', { className: 'ifx-score-hint' }, unread > 0 ? t('hero.unreadHint') : t('hero.readyHint')),
            h('div', { className: 'ifx-score-name' }, self.name || '—'),
          ),
        ),
        h('div', { className: 'ifx-stats' },
          h(Stat, { label: t('stat.peers'), value: String(peers.length) }),
          h(Stat, { label: t('stat.online'), value: `${online}` }),
          h(Stat, { label: t('stat.messages'), value: String(snapshot.lastSeq || 0) }),
          h(Stat, {
            label: t('stat.sync'),
            value: snapshot.lastSync ? relativeTime(snapshot.lastSync, t) : t('stat.never'),
            small: true,
          }),
        ),
        heroError ? h('div', { className: 'ifx-hero-error' }, heroError) : null,
      );
    }

    /**
     * One stat cell.
     * @param {object} props - Label and value.
     * @returns {object} React element.
     */
    function Stat({ label, value, small }) {
      return h('div', { className: 'ifx-stat' },
        h('div', { className: 'ifx-stat-label' }, label),
        h('div', { className: `ifx-stat-value ${small ? 'small' : ''}` }, value),
      );
    }

    /**
     * Network card with the live topology drawing.
     * @param {object} props - Snapshot, draft, and selection action.
     * @returns {object} React element.
     */
    function NetworkMapCard({ t, snapshot, draft, onSelectPeer }) {
      return h('section', { className: 'ifx-card ifx-map-card' },
        h('div', { className: 'ifx-card-head' },
          h('h2', { className: 'ifx-card-title' }, t('map.title')),
          h('span', { className: 'ifx-card-note' }, t('map.hint')),
        ),
        h(NetworkMap, { t, snapshot, draft, onSelectPeer }),
      );
    }

    /**
     * SVG mesh: this node at the center, peers on an orbit.
     * @param {object} props - Snapshot and selection action.
     * @returns {object} React element.
     */
    function NetworkMap({ t, snapshot, draft, onSelectPeer }) {
      const peers = (snapshot.peers || []).slice(0, 8);
      const unread = snapshot.unread || 0;
      const self = snapshot.self || { name: '' };
      const cx = 600;
      const cy = 150;
      const rx = 452;
      const ry = 96;
      const positions = peers.map((peer, index) => {
        let angle;
        if (peers.length === 1) angle = 0;
        else if (peers.length === 2) angle = index === 0 ? 0 : Math.PI;
        else angle = -Math.PI / 2 + (index * 2 * Math.PI) / peers.length;
        return { peer, x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry };
      });
      return h('svg', {
        viewBox: '0 0 1200 300',
        className: 'ifx-map',
        role: 'group',
        'aria-label': t('map.title'),
      },
      h('ellipse', { cx, cy, rx, ry, className: 'ifx-orbit' }),
      positions.map(({ peer, x, y }) => h('line', {
        key: `line-${peer.url}`,
        x1: cx,
        y1: cy,
        x2: x,
        y2: y,
        className: `ifx-map-line ${peer.online ? 'online' : ''}`,
      })),
      h('g', { className: 'ifx-map-self' },
        h('circle', { cx, cy, r: 38, className: 'ifx-map-halo' }),
        h('circle', { cx, cy, r: 27, className: 'ifx-map-core' }),
        h('text', { x: cx, y: cy + 4, textAnchor: 'middle', className: 'ifx-map-self-label' }, t('map.self')),
        h('text', { x: cx, y: cy + 62, textAnchor: 'middle', className: 'ifx-map-name' }, truncate(self.name || '—', 28)),
        unread > 0
          ? h('g', { className: 'ifx-map-badge' },
            h('circle', { cx: cx + 33, cy: cy - 33, r: 14, className: 'ifx-map-badge-bg' }),
            h('text', { x: cx + 33, y: cy - 28.5, textAnchor: 'middle', className: 'ifx-map-badge-text' }, unread > 99 ? '99+' : String(unread)),
          )
          : null,
      ),
      positions.map(({ peer, x, y }) => {
        const selected = draft && (draft.to === peer.nodeId || draft.to === peer.url);
        return h('g', {
          key: peer.url,
          className: `ifx-map-node ${peer.online ? 'online' : ''} ${selected ? 'selected' : ''}`,
          role: 'button',
          tabIndex: 0,
          onClick: () => onSelectPeer(peer),
          onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onSelectPeer(peer);
            }
          },
        },
        h('circle', { cx: x, cy: y, r: 21, className: 'ifx-map-peer' }),
        h('circle', { cx: x + 13, cy: y - 13, r: 4.2, className: `ifx-map-status ${peer.online ? 'on' : ''}` }),
        h('text', { x, y: y + 38, textAnchor: 'middle', className: 'ifx-map-label' }, truncate(peer.label || peer.nodeName || peer.url, 18)),
        );
      }),
      peers.length === 0
        ? h('text', { x: cx, y: cy + 112, textAnchor: 'middle', className: 'ifx-map-empty' }, t('map.empty'))
        : null,
      );
    }

    /**
     * Compose form.
     * @param {object} props - Draft, peers, and change handlers.
     * @returns {object} React element.
     */
    function ComposeCard({ t, draft, peers, disabled, textareaRef, onChange, onSend }) {
      const options = [{ value: '*', label: t('compose.broadcast') }]
        .concat(peers.map((peer) => ({
          value: peer.nodeId || peer.url,
          label: peer.label || peer.nodeName || peer.url,
        })));
      if (!options.some((option) => option.value === draft.to)) {
        options.push({ value: draft.to, label: draft.to });
      }
      const submit = () => {
        if (disabled || !draft.body.trim()) return;
        onSend({ ...draft, subject: draft.subject.trim() });
      };
      return h('section', { className: 'ifx-card ifx-compose' },
        h('div', { className: 'ifx-card-head' },
          h('h2', { className: 'ifx-card-title' }, t('compose.title')),
          draft.replyTo
            ? h('span', { className: 'ifx-reply-chip' }, t('compose.replying', { id: draft.replyTo.slice(0, 8) }))
            : null,
        ),
        h('div', { className: 'ifx-field-row' },
          h('label', { className: 'ifx-field' },
            h('span', { className: 'ifx-label' }, t('compose.to')),
            h('select', {
              className: 'ifx-select',
              value: draft.to,
              onChange: (event) => onChange({ ...draft, to: event.target.value }),
            }, options.map((option) => h('option', { key: option.value, value: option.value }, option.label))),
          ),
          h('label', { className: 'ifx-field' },
            h('span', { className: 'ifx-label' }, t('compose.kind')),
            h('select', {
              className: 'ifx-select',
              value: draft.kind,
              onChange: (event) => onChange({ ...draft, kind: event.target.value }),
            }, KINDS.map((kind) => h('option', { key: kind, value: kind }, t(`kind.${kind}`)))),
          ),
        ),
        h('label', { className: 'ifx-field ifx-block' },
          h('span', { className: 'ifx-label' }, t('compose.subject')),
          h('input', {
            className: 'ifx-input',
            value: draft.subject,
            maxLength: 200,
            placeholder: t('compose.subjectPlaceholder'),
            onChange: (event) => onChange({ ...draft, subject: event.target.value }),
          }),
        ),
        h('label', { className: 'ifx-field ifx-block' },
          h('span', { className: 'ifx-label' }, t('compose.body')),
          h('textarea', {
            className: 'ifx-textarea',
            ref: textareaRef,
            value: draft.body,
            maxLength: 16000,
            placeholder: t('compose.bodyPlaceholder'),
            onChange: (event) => onChange({ ...draft, body: event.target.value }),
            onKeyDown: (event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.preventDefault();
                submit();
              }
            },
          }),
        ),
        h('div', { className: 'ifx-compose-foot' },
          draft.replyTo
            ? h('button', {
              className: 'ifx-btn ghost small',
              onClick: () => onChange({ ...draft, replyTo: '' }),
            }, t('compose.cancelReply'))
            : h('span', { className: 'ifx-hint' }, draft.kind === 'request' ? t('compose.requestHint') : t('compose.hint')),
          h('button', {
            className: 'ifx-btn primary',
            disabled: disabled || !draft.body.trim(),
            onClick: submit,
          }, disabled ? t('compose.sending') : t('compose.send')),
        ),
      );
    }

    /**
     * Segmented tab/action row above the feed.
     * @param {object} props - Tabs and actions.
     * @returns {object} React element.
     */
    function FeedToolbar({ t, tab, setTab, scope, setScope, unread, peerCount, busy, onMarkAll, onSync }) {
      return h('div', { className: 'ifx-toolbar' },
        h('div', { className: 'ifx-segment', role: 'tablist' },
          h('button', {
            type: 'button',
            role: 'tab',
            'aria-selected': tab === 'inbox',
            className: tab === 'inbox' ? 'active' : '',
            onClick: () => setTab('inbox'),
          }, t('tab.inbox'), unread > 0 ? h('span', { className: 'ifx-count' }, String(unread)) : null),
          h('button', {
            type: 'button',
            role: 'tab',
            'aria-selected': tab === 'peers',
            className: tab === 'peers' ? 'active' : '',
            onClick: () => setTab('peers'),
          }, t('tab.peers'), peerCount > 0 ? h('span', { className: 'ifx-count quiet' }, String(peerCount)) : null),
        ),
        h('div', { className: 'ifx-toolbar-actions' },
          tab === 'inbox'
            ? h(React.Fragment, null,
              h('div', { className: 'ifx-segment small' },
                h('button', {
                  type: 'button',
                  className: scope === 'mine' ? 'active' : '',
                  onClick: () => setScope('mine'),
                }, t('inbox.mine')),
                h('button', {
                  type: 'button',
                  className: scope === 'all' ? 'active' : '',
                  onClick: () => setScope('all'),
                }, t('inbox.all')),
              ),
              h('button', {
                className: 'ifx-btn ghost',
                disabled: unread === 0 || busy === 'read',
                onClick: onMarkAll,
              }, t('inbox.markAll')),
            )
            : h('button', {
              className: 'ifx-btn',
              disabled: busy === 'sync' || peerCount === 0,
              onClick: onSync,
            }, busy === 'sync' ? t('peers.syncing') : t('peers.sync')),
        ),
      );
    }

    /**
     * Empty feed, with first-run instructions when no peer exists.
     * @param {object} props - Translate and actions.
     * @returns {object} React element.
     */
    function EmptyFeed({ t, hasPeers, hasMessages, onGoPeers, onCompose }) {
      const title = !hasPeers ? t('feed.emptyTitle') : hasMessages ? t('inbox.none') : t('feed.emptyTitle');
      const text = !hasPeers ? t('feed.emptyPeers') : hasMessages ? t('feed.filterHint') : t('feed.emptyHint');
      return h('div', { className: 'ifx-empty' },
        h('svg', {
          viewBox: '0 0 160 100',
          className: 'ifx-empty-art',
          'aria-hidden': true,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.2,
        },
        h('circle', { cx: 34, cy: 62, r: 8, className: 'ifx-empty-node' }),
        h('circle', { cx: 126, cy: 34, r: 5, className: 'ifx-empty-node faint' }),
        h('circle', { cx: 104, cy: 78, r: 4, className: 'ifx-empty-node faint' }),
        h('path', { d: 'M42 60 C 64 50, 78 42, 118 36', strokeDasharray: '3 6' }),
        h('path', { d: 'M41 65 C 62 72, 78 76, 96 77', strokeDasharray: '3 6' }),
        ),
        h('div', { className: 'ifx-empty-title' }, title),
        h('p', { className: 'ifx-empty-text' }, text),
        hasPeers && !hasMessages
          ? h('button', { className: 'ifx-btn primary ifx-top-gap', onClick: onCompose }, t('compose.title'))
          : !hasPeers
            ? h('div', { className: 'ifx-setup' },
              h('ol', { className: 'ifx-steps' },
                h(Step, { n: 1, text: t('setup.one') }),
                h(Step, { n: 2, text: t('setup.two') }),
                h(Step, { n: 3, text: t('setup.three') }),
                h(Step, { n: 4, text: t('setup.four') }),
              ),
              h('button', { className: 'ifx-btn primary ifx-top-gap', onClick: onGoPeers }, t('setup.cta')),
            )
            : null,
      );
    }

    /**
     * One numbered setup step.
     * @param {object} props - Number and text.
     * @returns {object} React element.
     */
    function Step({ n, text }) {
      return h('li', { className: 'ifx-step' },
        h('span', { className: 'ifx-step-num' }, String(n)),
        h('span', null, text),
      );
    }

    /**
     * Timeline of messages.
     * @param {object} props - Messages and actions.
     * @returns {object} React element.
     */
    function ActivityFeed({ t, messages, busy, onReply, onMarkRead }) {
      const [expanded, setExpanded] = React.useState({});
      const answered = new Set();
      for (const message of messages) {
        if (message.kind === 'answer' && message.replyTo) answered.add(message.replyTo);
      }
      return h('div', { className: 'ifx-feed' }, messages.map((message) => {
        const open = expanded[message.id] === true;
        return h(MessageCard, {
          key: message.id,
          t,
          message,
          open,
          busy,
          answered: answered.has(message.id),
          onToggle: () => {
            const next = !open;
            setExpanded((current) => ({ ...current, [message.id]: next }));
            if (next && !message.read) onMarkRead(message.id);
          },
          onReply: () => onReply(message),
          onMarkRead: () => onMarkRead(message.id),
        });
      }));
    }

    /**
     * One message bubble.
     * @param {object} props - Message and actions.
     * @returns {object} React element.
     */
    function MessageCard({ t, message, open, busy, answered, onToggle, onReply, onMarkRead }) {
      const long = message.body.length > 320;
      const destination = message.to === '*'
        ? t('compose.broadcast')
        : message.mine
          ? t('peers.self')
          : message.toLabel;
      return h('article', { className: `ifx-feed-item ${message.read ? '' : 'unread'}` },
        h('div', { className: 'ifx-avatar', 'data-tone': String(toneOf(message.from.id)) }, initialsOf(message.from.name)),
        h('div', { className: 'ifx-bubble' },
          h('div', { className: 'ifx-bubble-head' },
            h('span', { className: 'ifx-from' }, message.from.name),
            h('span', { className: `ifx-kind ${message.kind}` }, t(`kind.${message.kind}`)),
            message.kind === 'request'
              ? h('span', { className: `ifx-request-state ${answered ? 'done' : ''}` },
                t(answered ? 'request.answered' : 'request.pending'))
              : null,
            h('span', { className: 'ifx-time' }, relativeTime(message.ts, t)),
          ),
          h('div', { className: 'ifx-subject' }, message.subject),
          h('p', { className: 'ifx-body' }, open || !long ? message.body : `${message.body.slice(0, 320)}…`),
          h('div', { className: 'ifx-route' },
            `${t('compose.to')} · ${destination}`,
            message.kind === 'answer' && message.replyTo
              ? ` · ${t('request.replyTo')}`
              : '',
          ),
          h('div', { className: 'ifx-actions' },
            long
              ? h('button', { className: 'ifx-btn ghost small', onClick: onToggle }, open ? t('inbox.showLess') : t('inbox.showMore'))
              : null,
            !message.mine
              ? h('button', { className: 'ifx-btn ghost small', onClick: onReply }, t('compose.reply'))
              : null,
            !message.read
              ? h('button', {
                className: 'ifx-btn ghost small',
                disabled: busy === 'read',
                onClick: onMarkRead,
              }, t('inbox.markOne'))
              : null,
          ),
        ),
      );
    }

    /**
     * Peer management.
     * @param {object} props - Snapshot and actions.
     * @returns {object} React element.
     */
    function PeersPanel({ t, snapshot, busy, onAdd, onRemove, onConfigure, onDelegate, onRun, onRetry, onCancel }) {
      const [url, setUrl] = React.useState('');
      const [label, setLabel] = React.useState('');
      const [token, setToken] = React.useState('');
      const [confirming, setConfirming] = React.useState('');
      const peers = snapshot.peers || [];
      const settings = snapshot.settings || {};
      const role = settings.role || 'peer';
      const transport = settings.transport || 'http';
      const online = peers.filter((peer) => peer.online).length;

      const submit = async () => {
        if (!url.trim() || busy === 'add') return;
        try {
          await onAdd({ url: url.trim(), label: label.trim(), token });
          setUrl('');
          setLabel('');
          setToken('');
        } catch {
          // The page banner already shows the failure.
        }
      };

      const remove = async (peerUrl) => {
        if (confirming !== peerUrl) {
          setConfirming(peerUrl);
          window.setTimeout(() => setConfirming((current) => (current === peerUrl ? '' : current)), 4000);
          return;
        }
        setConfirming('');
        try {
          await onRemove(peerUrl);
        } catch {
          // The page banner already shows the failure.
        }
      };

      return h('div', { className: 'ifx-stack' },
        h(MqttCard, { t, snapshot, busy, onConfigure }),
        h(SkillsCard, { t, snapshot, onDelegate }),
        h(TasksCard, { t, snapshot, busy: busy === 'run' || busy === 'retry' || busy === 'cancel', onRun, onRetry, onCancel }),
        role === 'spoke' || transport === 'mqtt'
          ? null
          : h('section', { className: 'ifx-card' },
            h('div', { className: 'ifx-card-head' },
              h('h2', { className: 'ifx-card-title' }, t('peers.addPanel')),
              h('span', { className: 'ifx-card-note' }, t('peers.addHint')),
            ),
            h('div', { className: 'ifx-field-row ifx-top-gap' },
              h('label', { className: 'ifx-field' },
                h('span', { className: 'ifx-label' }, t('peers.url')),
                h('input', {
                  className: 'ifx-input',
                  value: url,
                  placeholder: 'http://192.168.1.23:47810',
                  onChange: (event) => setUrl(event.target.value),
                }),
              ),
              h('label', { className: 'ifx-field' },
                h('span', { className: 'ifx-label' }, t('peers.label')),
                h('input', {
                  className: 'ifx-input',
                  value: label,
                  onChange: (event) => setLabel(event.target.value),
                }),
              ),
            ),
            h('label', { className: 'ifx-field ifx-block' },
              h('span', { className: 'ifx-label' }, t('peers.token')),
              h('input', {
                className: 'ifx-input',
                value: token,
                type: 'password',
                onChange: (event) => setToken(event.target.value),
              }),
            ),
            h('div', { className: 'ifx-compose-foot' },
              h('span', { className: 'ifx-hint' }, t('peers.onlineCount', { online, total: peers.length })),
              h('button', {
                className: 'ifx-btn primary',
                disabled: busy === 'add' || !url.trim(),
                onClick: submit,
              }, busy === 'add' ? t('peers.adding') : t('peers.addButton')),
            ),
          ),
        h('section', { className: 'ifx-card' },
          h('div', { className: 'ifx-card-head' },
            h('h2', { className: 'ifx-card-title' }, t('peers.listPanel')),
            h('span', { className: 'ifx-card-note' }, t('peers.peerCount', { count: peers.length })),
          ),
          peers.length === 0
            ? h('div', { className: 'ifx-empty inline' },
              h('div', { className: 'ifx-empty-title' }, t('peers.empty')),
            )
            : h('div', { className: 'ifx-peers ifx-top-gap' }, peers.map((peer) => h(PeerCard, {
              key: peer.nodeId || peer.url || peer.label,
              t,
              peer,
              busy,
              confirming: peer.url !== '' && confirming === peer.url,
              onRemove: () => remove(peer.url),
            }))),
        ),
      );
    }

    /**
     * MQTT relay settings, editable at runtime from the panel.
     * @param {object} props - Snapshot and configuration action.
     * @returns {object} React element.
     */
    function MqttCard({ t, snapshot, busy, onConfigure }) {
      const settings = snapshot.settings || {};
      const active = settings.transport === 'mqtt';
      const [url, setUrl] = React.useState(settings.mqttUrl || 'wss://broker.emqx.io:8084/mqtt');
      const [room, setRoom] = React.useState(settings.mqttTopic || '');
      const [nodeName, setNodeName] = React.useState(settings.nodeName || '');
      const [mainNode, setMainNode] = React.useState(settings.mainNode === true);
      const [secret, setSecret] = React.useState('');
      const [username, setUsername] = React.useState('');
      const [password, setPassword] = React.useState('');
      const [saving, setSaving] = React.useState(false);
      const working = saving || busy === 'transport';
      const needsSecret = !settings.mqttSecretConfigured;

      const save = async () => {
        if (working || !url.trim() || !room.trim() || !nodeName.trim()) return;
        if (needsSecret && !secret.trim()) return;
        setSaving(true);
        try {
          await onConfigure({
            transport: 'mqtt',
            nodeName: nodeName.trim(),
            mainNode,
            mqttUrl: url.trim(),
            mqttTopic: room.trim(),
            mqttSecret: secret,
            mqttUsername: username.trim(),
            mqttPassword: password,
          });
        } catch {
          // The page banner already shows the failure.
        } finally {
          setSaving(false);
        }
      };

      const disable = async () => {
        if (working) return;
        setSaving(true);
        try {
          await onConfigure({ transport: 'http', nodeName: nodeName.trim(), mainNode });
        } catch {
          // The page banner already shows the failure.
        } finally {
          setSaving(false);
        }
      };

      const statusText = active
        ? settings.mqttStatus === 'connected'
          ? t('peers.mqttConnected')
          : settings.mqttStatus === 'error'
            ? t('peers.mqttError')
            : t('peers.mqttConnecting')
        : t('mqtt.off');

      return h('section', { className: 'ifx-card' },
        h('div', { className: 'ifx-card-head' },
          h('h2', { className: 'ifx-card-title' }, t('mqtt.title')),
          h('span', { className: 'ifx-card-note' }, statusText),
        ),
        h('p', { className: 'ifx-hint' }, t('mqtt.hint')),
        h('label', { className: 'ifx-field ifx-block' },
          h('span', { className: 'ifx-label' }, t('mqtt.nodeName')),
          h('input', {
            className: 'ifx-input',
            value: nodeName,
            placeholder: 'android',
            onChange: (event) => setNodeName(event.target.value),
          }),
          h('span', { className: 'ifx-hint' }, t('mqtt.nodeNameHint')),
        ),
        h('label', { className: 'ifx-check' },
          h('input', {
            type: 'checkbox',
            checked: mainNode,
            onChange: (event) => setMainNode(event.target.checked),
          }),
          h('span', null, t('skills.mainToggle')),
        ),
        h('div', { className: 'ifx-hint' }, t('skills.mainToggleHint')),
        h('div', { className: 'ifx-field-row ifx-top-gap' },
          h('label', { className: 'ifx-field' },
            h('span', { className: 'ifx-label' }, t('mqtt.broker')),
            h('input', {
              className: 'ifx-input',
              value: url,
              placeholder: 'wss://broker.emqx.io:8084/mqtt',
              onChange: (event) => setUrl(event.target.value),
            }),
          ),
          h('label', { className: 'ifx-field' },
            h('span', { className: 'ifx-label' }, t('mqtt.room')),
            h('input', {
              className: 'ifx-input',
              value: room,
              placeholder: 'interflow-xxxxxxxx',
              onChange: (event) => setRoom(event.target.value),
            }),
          ),
        ),
        h('div', { className: 'ifx-field-row ifx-top-gap' },
          h('label', { className: 'ifx-field' },
            h('span', { className: 'ifx-label' }, t('mqtt.secret')),
            h('input', {
              className: 'ifx-input',
              value: secret,
              type: 'password',
              placeholder: needsSecret ? t('mqtt.secretPlaceholder') : t('mqtt.secretKeep'),
              onChange: (event) => setSecret(event.target.value),
            }),
          ),
          h('label', { className: 'ifx-field' },
            h('span', { className: 'ifx-label' }, t('mqtt.username')),
            h('input', {
              className: 'ifx-input',
              value: username,
              onChange: (event) => setUsername(event.target.value),
            }),
          ),
        ),
        needsSecret
          ? h('div', { className: 'ifx-hint ifx-top-gap-sm' }, t('mqtt.secretRequired'))
          : null,
        h('label', { className: 'ifx-field ifx-block' },
          h('span', { className: 'ifx-label' }, t('mqtt.password')),
          h('input', {
            className: 'ifx-input',
            value: password,
            type: 'password',
            onChange: (event) => setPassword(event.target.value),
          }),
        ),
        active && settings.mqttError ? h('div', { className: 'ifx-error ifx-top-gap-sm' }, settings.mqttError) : null,
        h('div', { className: 'ifx-compose-foot' },
          active
            ? h('button', { className: 'ifx-btn ghost', disabled: working, onClick: disable }, t('mqtt.disable'))
            : h('span', { className: 'ifx-hint' }, settings.mqttSecretConfigured ? t('mqtt.secretSet') : ''),
          h('button', {
            className: 'ifx-btn primary',
            disabled: working || !url.trim() || !room.trim() || !nodeName.trim() || (needsSecret && !secret.trim()),
            onClick: save,
          }, working ? t('mqtt.saving') : active ? t('mqtt.save') : t('mqtt.enable')),
        ),
      );
    }

    /**
     * Skills advertised by the main node, with a one-click delegation action.
     * @param {object} props - Snapshot and delegation callback.
     * @returns {object} React element.
     */
    function SkillsCard({ t, snapshot, onDelegate }) {
      const settings = snapshot.settings || {};
      const peers = snapshot.peers || [];
      const local = settings.mainNode === true;
      const main = local
        ? {
          nodeId: (snapshot.self && snapshot.self.id) || '',
          nodeName: (snapshot.self && snapshot.self.name) || settings.nodeName || '',
          label: (snapshot.self && snapshot.self.name) || settings.nodeName || '',
          online: true,
          skills: (settings.skills || []).map((skill) => skill.name),
        }
        : peers.find((peer) => peer.mainNode === true);
      const skills = local
        ? (settings.skills || [])
        : (main && Array.isArray(main.skills) ? main.skills.map((name) => ({ name, description: '' })) : []);

      return h('section', { className: 'ifx-card' },
        h('div', { className: 'ifx-card-head' },
          h('h2', { className: 'ifx-card-title' }, t('skills.title')),
          h('span', { className: 'ifx-card-note' }, main
            ? (local ? t('skills.local') : t('skills.remote', { name: main.label || main.nodeName || '' }))
            : t('skills.none')),
        ),
        main
          ? null
          : h('div', { className: 'ifx-empty inline' },
            h('div', { className: 'ifx-empty-title' }, t('skills.none')),
            h('div', { className: 'ifx-hint' }, t('skills.noneHint')),
          ),
        main && skills.length === 0 ? h('div', { className: 'ifx-hint' }, t('skills.empty')) : null,
        skills.length > 0
          ? h('div', { className: 'ifx-peers ifx-top-gap' }, skills.map((skill) => h('article', {
            key: skill.name,
            className: 'ifx-peer-card',
          },
          h('div', { className: 'ifx-peer-top' },
            h('span', { className: 'ifx-peer-name' }, skill.name),
            local
              ? null
              : h('span', { className: 'ifx-peer-state' }, main.online ? t('peers.online') : t('peers.offline')),
          ),
          skill.description ? h('div', { className: 'ifx-peer-meta' }, skill.description) : null,
          local
            ? null
            : h('div', { className: 'ifx-compose-foot' },
              h('button', { className: 'ifx-btn ghost', onClick: () => onDelegate(skill, main) }, t('skills.delegate')),
            ),
          )))
          : null,
        h('div', { className: 'ifx-hint ifx-top-gap-sm' }, local ? t('skills.localHint') : t('skills.remoteHint')),
      );
    }

    /**
     * Multi-target task composer and recent task results.
     * @param {object} props - Snapshot, busy state, and run action.
     * @returns {object} React element.
     */
    function TasksCard({ t, snapshot, busy, onRun, onRetry, onCancel }) {
      const peers = snapshot.peers || [];
      const tasks = snapshot.tasks || [];
      const [selected, setSelected] = React.useState([]);
      const [all, setAll] = React.useState(false);
      const [subject, setSubject] = React.useState('');
      const [body, setBody] = React.useState('');
      const keys = peers.map((peer) => peer.nodeId || peer.url || peer.nodeName || peer.label).filter(Boolean);
      const toggle = (key) => setSelected((current) => (current.includes(key)
        ? current.filter((value) => value !== key)
        : [...current, key]));
      const run = () => {
        const targets = all ? ['*'] : selected;
        if (busy || !body.trim() || targets.length === 0) return;
        onRun({ targets, subject: subject.trim(), body: body.trim() })
          .then(() => {
            setBody('');
            setSelected([]);
            setAll(false);
          })
          .catch(() => {});
      };
      const statusText = (status) => {
        if (status === 'done') return t('tasks.done');
        if (status === 'partial') return t('tasks.partial');
        if (status === 'failed') return t('tasks.failed');
        if (status === 'running') return t('tasks.runningStatus');
        return status;
      };
      const targetText = (status) => {
        if (status === 'answered') return t('tasks.answered');
        if (status === 'timeout') return t('tasks.timeout');
        if (status === 'error') return t('tasks.error');
        if (status === 'cancelled') return t('tasks.cancelledTarget');
        return t('tasks.waiting');
      };
      const renderTask = (task) => h('article', { key: task.id, className: 'ifx-peer-card' },
        h('div', { className: 'ifx-peer-top' },
          h('span', { className: 'ifx-peer-name' }, task.subject),
          h('span', { className: 'ifx-peer-state' }, statusText(task.status)),
        ),
        h('div', { className: 'ifx-peer-meta' }, new Date(task.createdAt).toLocaleString()),
        h('div', { className: 'ifx-task-targets' }, task.targets.map((target) => h('div', {
          key: target.requestId || target.label,
          className: 'ifx-task-row',
        },
        h('span', { className: 'ifx-peer-name' }, target.label),
        h('span', { className: 'ifx-peer-state' }, targetText(target.status)),
        target.answer ? h('div', { className: 'ifx-peer-meta' }, target.answer.slice(0, 500)) : null,
        target.error ? h('div', { className: 'ifx-peer-error' }, target.error) : null,
        ))),
        h('div', { className: 'ifx-compose-foot' },
          task.targets.some((target) => target.status === 'waiting')
            ? h('button', { className: 'ifx-btn ghost', disabled: busy, onClick: () => onCancel(task.id) }, t('tasks.cancel'))
            : null,
          task.targets.some((target) => target.status === 'timeout' || target.status === 'error' || target.status === 'cancelled')
            ? h('button', { className: 'ifx-btn ghost', disabled: busy, onClick: () => onRetry(task.id) }, t('tasks.retry'))
            : null,
        ),
      );

      return h('section', { className: 'ifx-card' },
        h('div', { className: 'ifx-card-head' },
          h('h2', { className: 'ifx-card-title' }, t('tasks.title')),
          h('span', { className: 'ifx-card-note' }, t('tasks.count', { count: tasks.length })),
        ),
        peers.length === 0
          ? h('div', { className: 'ifx-hint' }, t('tasks.noPeers'))
          : h('div', null,
            h('label', { className: 'ifx-check' },
              h('input', {
                type: 'checkbox',
                checked: all,
                onChange: (event) => setAll(event.target.checked),
              }),
              h('span', null, t('tasks.all')),
            ),
            h('div', { className: 'ifx-task-targets' }, peers.map((peer) => {
              const key = peer.nodeId || peer.url || peer.nodeName || peer.label;
              return h('label', { key, className: 'ifx-check' },
                h('input', {
                  type: 'checkbox',
                  checked: all || selected.includes(key),
                  disabled: all,
                  onChange: () => toggle(key),
                }),
                h('span', null, peer.label || peer.nodeName || peer.url),
              );
            })),
            h('label', { className: 'ifx-field ifx-block ifx-top-gap' },
              h('span', { className: 'ifx-label' }, t('tasks.subject')),
              h('input', {
                className: 'ifx-input',
                value: subject,
                onChange: (event) => setSubject(event.target.value),
              }),
            ),
            h('label', { className: 'ifx-field ifx-block' },
              h('span', { className: 'ifx-label' }, t('tasks.body')),
              h('textarea', {
                className: 'ifx-input',
                rows: 3,
                value: body,
                onChange: (event) => setBody(event.target.value),
              }),
            ),
            h('div', { className: 'ifx-compose-foot' },
              h('span', { className: 'ifx-hint' }, t('tasks.hint')),
              h('button', {
                className: 'ifx-btn primary',
                disabled: busy || !body.trim() || (!all && selected.length === 0),
                onClick: run,
              }, busy ? t('tasks.running') : t('tasks.run')),
            ),
          ),
        tasks.length === 0
          ? h('div', { className: 'ifx-hint ifx-top-gap' }, t('tasks.empty'))
          : h('div', { className: 'ifx-stack ifx-top-gap' }, tasks.map(renderTask)),
      );
    }

    /**
     * One peer tile.
     * @param {object} props - Peer and actions.
     * @returns {object} React element.
     */
    function PeerCard({ t, peer, busy, confirming, onRemove }) {
      const removable = peer.url !== '' && peer.kind !== 'member' && peer.kind !== 'hub';
      const detail = peer.url || peer.nodeId || '';
      const meta = [];
      if (peer.kind === 'hub') meta.push(t('peers.hub'));
      else if (peer.kind === 'member') meta.push(t('peers.member'));
      if (peer.mainNode) meta.push(t('peers.main'));
      meta.push(peer.lastSeen
        ? t('peers.lastSeen', { time: relativeTime(peer.lastSeen, t) })
        : t('peers.never'));
      return h('article', { className: `ifx-peer-card ${peer.online ? 'online' : ''}` },
        h('div', { className: 'ifx-peer-top' },
          h('span', { className: `ifx-dot ${peer.online ? 'on' : ''}` }),
          h('span', { className: 'ifx-peer-name' }, peer.label || peer.nodeName || peer.url),
          h('span', { className: 'ifx-peer-state' }, peer.online ? t('peers.online') : t('peers.offline')),
        ),
        h('div', { className: 'ifx-peer-url' }, detail),
        h('div', { className: 'ifx-peer-meta' }, meta.join(' · ')),
        peer.lastError ? h('div', { className: 'ifx-peer-error' }, t('peers.error', { message: peer.lastError })) : null,
        h('div', { className: 'ifx-peer-actions' },
          h('span', { className: 'ifx-mono ifx-peer-id' }, truncate(peer.nodeId || peer.nodeName || '', 14)),
          removable
            ? h('button', {
              className: `ifx-btn ${confirming ? 'danger' : 'ghost'} small`,
              disabled: busy === 'remove',
              onClick: onRemove,
            }, confirming ? t('peers.confirmRemove') : t('peers.remove'))
            : null,
        ),
      );
    }

    const CSS = `
.ifx-page{height:100%;overflow:auto;box-sizing:border-box;padding:22px 26px 64px;color:var(--dsw-alias-label-primary);font-size:14px;line-height:1.5;background:radial-gradient(70% 34% at 50% -6%,color-mix(in srgb,var(--dsw-alias-brand-primary) 8%,transparent),transparent 70%);}
.ifx-shell{max-width:1100px;margin:0 auto;display:flex;flex-direction:column;gap:14px;}
.ifx-hero{position:relative;overflow:hidden;border:1px solid var(--dsw-alias-border-l1);border-radius:22px;padding:26px 28px 0;background:radial-gradient(120% 170% at 0% -50%,color-mix(in srgb,var(--dsw-alias-brand-primary) 30%,transparent),transparent 55%),radial-gradient(80% 130% at 100% -20%,color-mix(in srgb,var(--dsw-alias-state-idle-primary) 20%,transparent),transparent 60%),var(--dsw-alias-bg-layer-1);box-shadow:0 26px 60px color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent);}
.ifx-hero::after{content:'';position:absolute;inset:0;pointer-events:none;opacity:.45;background-image:linear-gradient(color-mix(in srgb,var(--dsw-alias-border-l1) 60%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb,var(--dsw-alias-border-l1) 60%,transparent) 1px,transparent 1px);background-size:34px 34px;mask-image:radial-gradient(110% 120% at 20% 0%,#000 0%,transparent 68%);}
.ifx-hero>*{position:relative;z-index:1;}
.ifx-hero-grid{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px;align-items:end;padding-bottom:20px;}
.ifx-eyebrow{display:inline-flex;align-items:center;gap:9px;font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--dsw-alias-label-secondary);}
.ifx-live{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-state-idle-primary);}
.ifx-live.on{background:var(--dsw-alias-state-success-primary);box-shadow:0 0 0 4px color-mix(in srgb,var(--dsw-alias-state-success-primary) 18%,transparent),0 0 12px color-mix(in srgb,var(--dsw-alias-state-success-primary) 55%,transparent);}
.ifx-title{font-size:clamp(27px,3.4vw,40px);line-height:1.04;letter-spacing:-0.035em;font-weight:650;margin:10px 0 8px;background:linear-gradient(100deg,var(--dsw-alias-label-primary) 40%,color-mix(in srgb,var(--dsw-alias-brand-primary) 85%,var(--dsw-alias-label-primary)) 100%);-webkit-background-clip:text;background-clip:text;color:transparent;}
.ifx-hero-sub{margin:0;max-width:560px;color:var(--dsw-alias-label-secondary);font-size:13px;}
.ifx-hero-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:16px;}
.ifx-address{appearance:none;display:inline-flex;align-items:center;gap:8px;max-width:100%;border:1px solid var(--dsw-alias-border-l1);background:color-mix(in srgb,var(--dsw-alias-bg-base) 55%,transparent);color:var(--dsw-alias-label-primary);border-radius:10px;padding:6px 10px;font:inherit;font-size:11.5px;cursor:pointer;transition:border-color .15s,background .15s;}
.ifx-address:hover:not(:disabled){border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 45%,transparent);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 8%,transparent);}
.ifx-address:disabled{cursor:default;opacity:.7;}
.ifx-address-dot{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-brand-primary);box-shadow:0 0 8px color-mix(in srgb,var(--dsw-alias-brand-primary) 60%,transparent);flex:none;}
.ifx-address .ifx-mono{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.ifx-address-action{font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--dsw-alias-brand-primary);flex:none;}
.ifx-pill{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--dsw-alias-border-l1);border-radius:999px;padding:4px 10px;font-size:11.5px;color:var(--dsw-alias-label-secondary);background:color-mix(in srgb,var(--dsw-alias-bg-base) 40%,transparent);white-space:nowrap;}
.ifx-score{min-width:150px;text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:1px;}
.ifx-score-number{font-size:56px;line-height:1;font-weight:600;letter-spacing:-0.045em;font-variant-numeric:tabular-nums;color:var(--dsw-alias-brand-primary);text-shadow:0 0 34px color-mix(in srgb,var(--dsw-alias-brand-primary) 38%,transparent);}
.ifx-score-number.zero{color:var(--dsw-alias-label-secondary);text-shadow:none;}
.ifx-score-label{font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--dsw-alias-label-secondary);}
.ifx-score-hint{font-size:11.5px;color:var(--dsw-alias-label-secondary);margin-top:2px;}
.ifx-score-name{font-size:12px;color:var(--dsw-alias-label-secondary);margin-top:8px;max-width:230px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.ifx-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-top:1px solid color-mix(in srgb,var(--dsw-alias-border-l1) 80%,transparent);}
.ifx-stat{padding:13px 0 17px 18px;border-left:1px solid color-mix(in srgb,var(--dsw-alias-border-l1) 55%,transparent);min-width:0;}
.ifx-stat:first-child{border-left:0;padding-left:0;}
.ifx-stat-label{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--dsw-alias-label-secondary);}
.ifx-stat-value{font-size:20px;font-weight:600;margin-top:2px;font-variant-numeric:tabular-nums;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.ifx-stat-value.small{font-size:14px;font-weight:500;}
.ifx-hero-error{margin:0 -28px;padding:9px 28px;border-top:1px solid color-mix(in srgb,var(--dsw-alias-state-error-primary) 30%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 8%,transparent);color:var(--dsw-alias-state-error-primary);font-size:12px;}
.ifx-card{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);border-radius:16px;padding:16px 18px;box-shadow:0 16px 40px color-mix(in srgb,var(--dsw-alias-label-primary) 5%,transparent);min-width:0;}
.ifx-card-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}
.ifx-card-title{margin:0;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--dsw-alias-label-secondary);font-weight:600;}
.ifx-card-note{font-size:11.5px;color:var(--dsw-alias-label-secondary);}
.ifx-map-card{padding:14px 18px 6px;}
.ifx-map{width:100%;height:auto;display:block;overflow:visible;margin-top:4px;}
.ifx-orbit{fill:none;stroke:var(--dsw-alias-border-l1);stroke-dasharray:3 9;opacity:.85;}
.ifx-map-line{stroke:color-mix(in srgb,var(--dsw-alias-label-secondary) 32%,transparent);stroke-width:1.4;stroke-dasharray:5 7;}
.ifx-map-line.online{stroke:color-mix(in srgb,var(--dsw-alias-brand-primary) 72%,transparent);stroke-dasharray:6 8;animation:ifx-dash 1.6s linear infinite;}
.ifx-map-halo{fill:color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,transparent);stroke:color-mix(in srgb,var(--dsw-alias-brand-primary) 26%,transparent);animation:ifx-pulse 3.2s ease-out infinite;transform-box:fill-box;transform-origin:center;}
.ifx-map-core{fill:color-mix(in srgb,var(--dsw-alias-brand-primary) 20%,var(--dsw-alias-bg-layer-1));stroke:var(--dsw-alias-brand-primary);stroke-width:1.6;}
.ifx-map-self-label{fill:var(--dsw-alias-brand-primary);font-size:10px;font-weight:600;letter-spacing:.14em;}
.ifx-map-name{fill:var(--dsw-alias-label-secondary);font-size:10.5px;}
.ifx-map-peer{fill:var(--dsw-alias-bg-layer-2);stroke:var(--dsw-alias-state-idle-primary);stroke-width:1.4;transition:fill .15s,stroke .15s;}
.ifx-map-node{cursor:pointer;outline:none;}
.ifx-map-node.online .ifx-map-peer{stroke:var(--dsw-alias-state-success-primary);}
.ifx-map-node:hover .ifx-map-peer,.ifx-map-node:focus-visible .ifx-map-peer{fill:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,var(--dsw-alias-bg-layer-1));stroke:var(--dsw-alias-brand-primary);}
.ifx-map-node.selected .ifx-map-peer{stroke:var(--dsw-alias-brand-primary);stroke-width:2.6;}
.ifx-map-status{fill:var(--dsw-alias-state-idle-primary);stroke:var(--dsw-alias-bg-layer-1);stroke-width:2;}
.ifx-map-status.on{fill:var(--dsw-alias-state-success-primary);}
.ifx-map-label{fill:var(--dsw-alias-label-secondary);font-size:11px;}
.ifx-map-node:hover .ifx-map-label{fill:var(--dsw-alias-label-primary);}
.ifx-map-badge-bg{fill:color-mix(in srgb,var(--dsw-alias-brand-primary) 18%,var(--dsw-alias-bg-layer-1));stroke:color-mix(in srgb,var(--dsw-alias-brand-primary) 45%,transparent);}
.ifx-map-badge-text{fill:var(--dsw-alias-brand-primary);font-size:10.5px;font-weight:700;}
.ifx-map-empty{fill:var(--dsw-alias-label-secondary);font-size:11.5px;}
.ifx-columns{display:grid;grid-template-columns:minmax(300px,400px) minmax(0,1fr);gap:14px;align-items:start;}
.ifx-col-left,.ifx-col-main{min-width:0;display:flex;flex-direction:column;gap:12px;}
.ifx-toolbar{position:sticky;top:0;z-index:3;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:4px 0 8px;background:linear-gradient(to bottom,color-mix(in srgb,var(--dsw-alias-bg-base) 94%,transparent) 72%,transparent);backdrop-filter:blur(6px);}
.ifx-toolbar-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.ifx-segment{display:inline-flex;align-items:center;gap:2px;padding:3px;border-radius:12px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);}
.ifx-segment button{appearance:none;border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12.5px;padding:6px 12px;border-radius:9px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:color .15s,background .15s;}
.ifx-segment button:hover{color:var(--dsw-alias-label-primary);}
.ifx-segment button.active{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);box-shadow:0 1px 3px color-mix(in srgb,var(--dsw-alias-label-primary) 12%,transparent);}
.ifx-segment.small button{font-size:11.5px;padding:4px 10px;}
.ifx-count{font-size:10.5px;min-width:17px;height:17px;border-radius:8px;padding:0 5px;display:inline-flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 16%,transparent);color:var(--dsw-alias-brand-primary);}
.ifx-count.quiet{background:color-mix(in srgb,var(--dsw-alias-label-secondary) 14%,transparent);color:var(--dsw-alias-label-secondary);}
.ifx-btn{appearance:none;font:inherit;font-size:12.5px;border-radius:9px;padding:6px 13px;cursor:pointer;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-primary);transition:background .15s,border-color .15s,box-shadow .15s;}
.ifx-btn:hover{background:var(--dsw-alias-bg-layer-2);}
.ifx-btn:disabled{opacity:.5;cursor:default;}
.ifx-btn.primary{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 48%,transparent);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 15%,transparent);color:var(--dsw-alias-brand-primary);box-shadow:0 6px 18px color-mix(in srgb,var(--dsw-alias-brand-primary) 16%,transparent);}
.ifx-btn.primary:hover{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 24%,transparent);}
.ifx-btn.danger{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 36%,transparent);}
.ifx-btn.ghost{border-color:transparent;color:var(--dsw-alias-label-secondary);}
.ifx-btn.ghost:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);}
.ifx-btn.small{font-size:11.5px;padding:3px 8px;}
.ifx-banner{display:flex;align-items:center;justify-content:space-between;gap:12px;border-radius:12px;padding:10px 14px;font-size:12.5px;border:1px solid transparent;animation:ifx-rise .2s ease-out;}
.ifx-banner.ok{color:var(--dsw-alias-state-success-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 30%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 8%,transparent);}
.ifx-banner.bad{color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 30%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 8%,transparent);}
.ifx-label{display:block;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--dsw-alias-label-secondary);margin:0 0 6px;}
.ifx-field{display:block;min-width:0;}
.ifx-field-row{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:10px;}
.ifx-block{margin-top:12px;}
.ifx-input,.ifx-select,.ifx-textarea{width:100%;box-sizing:border-box;font:inherit;font-size:13px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l1);border-radius:10px;padding:8px 10px;outline:none;transition:border-color .15s,box-shadow .15s;}
.ifx-input:focus,.ifx-select:focus,.ifx-textarea:focus{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-brand-primary) 18%,transparent);}
.ifx-textarea{min-height:116px;resize:vertical;line-height:1.6;}
.ifx-compose-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px;flex-wrap:wrap;}
.ifx-hint{font-size:11.5px;color:var(--dsw-alias-label-secondary);}
.ifx-reply-chip{font-size:11px;padding:3px 9px;border-radius:999px;color:var(--dsw-alias-brand-primary);border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 35%,transparent);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 8%,transparent);}
.ifx-feed{position:relative;display:flex;flex-direction:column;gap:12px;padding-left:2px;}
.ifx-feed::before{content:'';position:absolute;left:21px;top:12px;bottom:12px;width:1px;background:linear-gradient(to bottom,var(--dsw-alias-border-l1),transparent 94%);}
.ifx-feed-item{position:relative;display:grid;grid-template-columns:42px minmax(0,1fr);gap:12px;animation:ifx-rise .22s ease-out both;}
.ifx-avatar{position:relative;z-index:1;width:36px;height:36px;margin-top:3px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);}
.ifx-avatar[data-tone="0"]{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 16%,var(--dsw-alias-bg-layer-1));color:var(--dsw-alias-brand-primary);border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 30%,transparent);}
.ifx-avatar[data-tone="1"]{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 15%,var(--dsw-alias-bg-layer-1));color:var(--dsw-alias-state-success-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 30%,transparent);}
.ifx-avatar[data-tone="2"]{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 16%,var(--dsw-alias-bg-layer-1));color:var(--dsw-alias-state-warn-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 32%,transparent);}
.ifx-avatar[data-tone="3"]{background:color-mix(in srgb,var(--dsw-alias-state-idle-primary) 18%,var(--dsw-alias-bg-layer-1));color:var(--dsw-alias-label-secondary);border-color:color-mix(in srgb,var(--dsw-alias-state-idle-primary) 30%,transparent);}
.ifx-avatar[data-tone="4"]{background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 14%,var(--dsw-alias-bg-layer-1));color:var(--dsw-alias-state-error-primary);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 28%,transparent);}
.ifx-bubble{border:1px solid var(--dsw-alias-border-l1);border-radius:14px;padding:12px 14px;background:var(--dsw-alias-bg-layer-1);transition:border-color .15s,box-shadow .15s;}
.ifx-bubble:hover{border-color:var(--dsw-alias-border-l2);box-shadow:0 12px 28px color-mix(in srgb,var(--dsw-alias-label-primary) 6%,transparent);}
.ifx-feed-item.unread .ifx-bubble{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 34%,var(--dsw-alias-border-l1));background:linear-gradient(180deg,color-mix(in srgb,var(--dsw-alias-brand-primary) 5%,var(--dsw-alias-bg-layer-1)),var(--dsw-alias-bg-layer-1) 60%);}
.ifx-bubble-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.ifx-from{font-weight:600;font-size:13px;}
.ifx-time{margin-left:auto;font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap;}
.ifx-subject{font-weight:600;font-size:14.5px;margin-top:6px;letter-spacing:-0.01em;}
.ifx-body{margin:6px 0 0;font-size:13px;white-space:pre-wrap;word-break:break-word;color:var(--dsw-alias-label-primary);opacity:.92;}
.ifx-route{font-size:11px;color:var(--dsw-alias-label-secondary);margin-top:7px;}
.ifx-actions{display:flex;gap:6px;margin-top:9px;opacity:.55;transition:opacity .15s;flex-wrap:wrap;}
.ifx-feed-item:hover .ifx-actions,.ifx-feed-item:focus-within .ifx-actions{opacity:1;}
.ifx-kind{font-size:10px;line-height:17px;padding:0 8px;border-radius:999px;letter-spacing:.08em;text-transform:uppercase;border:1px solid transparent;white-space:nowrap;}
.ifx-kind.note{background:color-mix(in srgb,var(--dsw-alias-label-secondary) 13%,transparent);color:var(--dsw-alias-label-secondary);}
.ifx-kind.alert{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 16%,transparent);color:var(--dsw-alias-state-warn-primary);}
.ifx-kind.question{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent);color:var(--dsw-alias-brand-primary);}
.ifx-kind.answer{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 16%,transparent);color:var(--dsw-alias-state-success-primary);}
.ifx-kind.handoff{background:color-mix(in srgb,var(--dsw-alias-state-idle-primary) 18%,transparent);color:var(--dsw-alias-label-secondary);}
.ifx-kind.request{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 16%,transparent);color:var(--dsw-alias-state-warn-primary);}
.ifx-request-state{font-size:10px;line-height:17px;padding:0 7px;border-radius:999px;border:1px dashed color-mix(in srgb,var(--dsw-alias-brand-primary) 40%,transparent);color:var(--dsw-alias-brand-primary);white-space:nowrap;}
.ifx-request-state.done{border-style:solid;border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 36%,transparent);color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 8%,transparent);}
.ifx-empty{display:flex;flex-direction:column;align-items:center;text-align:center;padding:38px 22px;border:1px dashed var(--dsw-alias-border-l1);border-radius:16px;background:color-mix(in srgb,var(--dsw-alias-bg-layer-1) 65%,transparent);}
.ifx-empty.inline{padding:22px 12px;border:0;background:transparent;}
.ifx-empty-art{width:150px;height:94px;color:color-mix(in srgb,var(--dsw-alias-brand-primary) 45%,var(--dsw-alias-label-secondary));margin-bottom:6px;}
.ifx-empty-node{fill:color-mix(in srgb,var(--dsw-alias-brand-primary) 18%,transparent);stroke:var(--dsw-alias-brand-primary);}
.ifx-empty-node.faint{fill:transparent;stroke:var(--dsw-alias-border-l2);}
.ifx-empty-title{font-size:16px;font-weight:600;}
.ifx-empty-text{margin:4px 0 0;font-size:12.5px;color:var(--dsw-alias-label-secondary);max-width:440px;}
.ifx-setup{width:100%;display:flex;flex-direction:column;align-items:center;}
.ifx-steps{list-style:none;margin:14px 0 0;padding:0;display:grid;gap:8px;width:100%;max-width:560px;text-align:left;}
.ifx-step{display:grid;grid-template-columns:24px minmax(0,1fr);gap:10px;align-items:start;font-size:12.5px;color:var(--dsw-alias-label-secondary);}
.ifx-step-num{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent);border:1px solid color-mix(in srgb,var(--dsw-alias-brand-primary) 26%,transparent);}
.ifx-stack{display:flex;flex-direction:column;gap:12px;}
.ifx-top-gap{margin-top:12px;}
.ifx-peers{display:grid;grid-template-columns:repeat(auto-fill,minmax(232px,1fr));gap:12px;}
.ifx-peer-card{position:relative;overflow:hidden;border:1px solid var(--dsw-alias-border-l1);border-radius:14px;padding:13px 14px;background:var(--dsw-alias-bg-layer-1);display:flex;flex-direction:column;gap:7px;min-width:0;}
.ifx-peer-card::before{content:'';position:absolute;inset:0 0 auto;height:2px;background:linear-gradient(90deg,color-mix(in srgb,var(--dsw-alias-label-secondary) 30%,transparent),transparent 70%);}
.ifx-peer-card.online::before{background:linear-gradient(90deg,var(--dsw-alias-state-success-primary),transparent 75%);}
.ifx-peer-top{display:flex;align-items:center;gap:8px;min-width:0;}
.ifx-peer-name{font-weight:600;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;}
.ifx-peer-state{margin-left:auto;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--dsw-alias-label-secondary);white-space:nowrap;}
.ifx-peer-card.online .ifx-peer-state{color:var(--dsw-alias-state-success-primary);}
.ifx-peer-url{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;color:var(--dsw-alias-label-secondary);word-break:break-all;}
.ifx-peer-meta{font-size:11.5px;color:var(--dsw-alias-label-secondary);}
.ifx-peer-error{font-size:11.5px;color:var(--dsw-alias-state-error-primary);word-break:break-word;}
.ifx-peer-actions{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:auto;padding-top:6px;}
.ifx-peer-id{font-size:10.5px;color:var(--dsw-alias-label-secondary);}
.ifx-dot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-state-idle-primary);flex:none;}
.ifx-dot.on{background:var(--dsw-alias-state-success-primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--dsw-alias-state-success-primary) 16%,transparent);}
.ifx-dot.warn{background:var(--dsw-alias-state-warn-primary);}
.ifx-dot.bad{background:var(--dsw-alias-state-error-primary);}
.ifx-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;}
.ifx-error{color:var(--dsw-alias-state-error-primary);font-size:12px;}
.ifx-hint{margin:0;font-size:11.5px;color:var(--dsw-alias-label-secondary);}
.ifx-check{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:12px;color:var(--dsw-alias-label-secondary);}
.ifx-check input{width:14px;height:14px;accent-color:var(--dsw-alias-brand-primary);}
.ifx-task-targets{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;}
.ifx-task-row{display:flex;flex-wrap:wrap;align-items:center;gap:8px;width:100%;padding-top:7px;margin-top:7px;border-top:1px dashed var(--dsw-alias-border-l1);}
.ifx-task-row .ifx-peer-meta{width:100%;}
.ifx-peer-card .ifx-compose-foot{margin-top:10px;}
@keyframes ifx-pulse{0%{transform:scale(.86);opacity:.85}70%{transform:scale(1.5);opacity:0}100%{transform:scale(1.5);opacity:0}}
@keyframes ifx-dash{to{stroke-dashoffset:-28}}
@keyframes ifx-rise{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.ifx-map-line.online,.ifx-map-halo,.ifx-feed-item,.ifx-banner{animation:none;}}
@media (max-width:960px){.ifx-columns{grid-template-columns:minmax(0,1fr);}.ifx-hero-grid{grid-template-columns:minmax(0,1fr);}.ifx-score{align-items:flex-start;text-align:left;}.ifx-stats{grid-template-columns:repeat(2,minmax(0,1fr));}.ifx-stat:nth-child(3){border-left:0;padding-left:0;}}
@media (max-width:640px){.ifx-page{padding:16px 14px 48px;}.ifx-hero{padding:20px 18px 0;border-radius:18px;}.ifx-hero-error{margin:0 -18px;padding:9px 18px;}.ifx-stat-value{font-size:17px;}.ifx-field-row{grid-template-columns:minmax(0,1fr);}}
`;

    return { name: 'interflow', inject, apply };
  },
});
