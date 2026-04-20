import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNotification } from './NotificationProvider';
import { syncAppIconBadge } from './notificationUtils';
import './AIAssistantWidget.css';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const CHAT_REALTIME_POLL_INTERVAL_MS = 5000;
const THREAD_SCROLL_BOTTOM_THRESHOLD_PX = 72;
const INLINE_LINK_PATTERN = /(https?:\/\/[^\s<>"']+|\/career-guide\/[a-zA-Z0-9\-._~%]+)/gi;

const buildInitialAiMessages = (t) => [
  {
    role: 'assistant',
    content: t('components.aiAssistantWidget.initialAssistantMessage')
  }
];

const splitTrailingPunctuation = (token = '') => {
  let link = String(token || '');
  let trailingText = '';

  while (link && /[),.;!?]$/.test(link)) {
    trailingText = link.slice(-1) + trailingText;
    link = link.slice(0, -1);
  }

  return { link, trailingText };
};

const renderTextWithLinks = (text = '') => {
  const value = String(text || '');
  const lines = value.split('\n');

  return lines.map((line, lineIndex) => {
    const nodes = [];
    let cursor = 0;

    line.replace(INLINE_LINK_PATTERN, (match, offset) => {
      if (offset > cursor) {
        nodes.push(line.slice(cursor, offset));
      }

      const { link, trailingText } = splitTrailingPunctuation(match);
      if (link) {
        nodes.push(
          <a key={`line-${lineIndex}-link-${offset}`} href={link} target="_blank" rel="noreferrer">
            {link}
          </a>
        );
      }

      if (trailingText) {
        nodes.push(trailingText);
      }

      cursor = offset + match.length;
      return match;
    });

    if (cursor < line.length) {
      nodes.push(line.slice(cursor));
    }

    return (
      <React.Fragment key={`line-${lineIndex}`}>
        {nodes.length ? nodes : line}
        {lineIndex < lines.length - 1 ? <br /> : null}
      </React.Fragment>
    );
  });
};

const getUserId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.id || user?.MaNguoiDung || user?.maNguoiDung || user?.userId || user?.userID || null;
  } catch {
    return null;
  }
};

const getToken = () => {
  try {
    return localStorage.getItem('token') || '';
  } catch {
    return '';
  }
};

const isProviderBusyError = (text = '') => {
  const value = String(text || '').toLowerCase();
  return (
    /\b(gemini|openai)\s+error\s+(429|500|502|503|504)\b/i.test(value) ||
    /"code"\s*:\s*(429|500|502|503|504)/i.test(value) ||
    value.includes('high demand') ||
    value.includes('overloaded') ||
    value.includes('temporarily') ||
    value.includes('unavailable') ||
    value.includes('rate limit') ||
    value.includes('quota')
  );
};

const toFriendlyAiError = (text = '', t) => {
  const value = String(text || '').trim();
  if (!value) return t('components.aiAssistantWidget.errors.callAiFailed');
  if (isProviderBusyError(value) || /"error"\s*:\s*\{/i.test(value)) {
    return t('components.aiAssistantWidget.errors.providerBusy');
  }
  return value;
};

const normalizeAssistantReply = (text = '', t) => {
  const value = String(text || '').trim();
  if (!value) return '';
  if (isProviderBusyError(value) || /"error"\s*:\s*\{/i.test(value)) {
    return t('components.aiAssistantWidget.errors.providerBusyReply');
  }
  return value;
};

const AIAssistantWidget = () => {
  const { t } = useTranslation();
  const { notify, requestConfirm } = useNotification();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [pillExpanded, setPillExpanded] = useState(true);

  const [chatOpen, setChatOpen] = useState(false);
  const [unreadConversations, setUnreadConversations] = useState(0);
  const [inbox, setInbox] = useState([]);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [activeChatUser, setActiveChatUser] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [messages, setMessages] = useState(() => buildInitialAiMessages(t));
  const [cvOptions, setCvOptions] = useState([]);
  const [cvLoading, setCvLoading] = useState(false);
  const [selectedCvId, setSelectedCvId] = useState('');
  const [pendingUploadFile, setPendingUploadFile] = useState(null);
  const [cvModalOpen, setCvModalOpen] = useState(false);

  const listRef = useRef(null);
  const threadListRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatPollInFlightRef = useRef(false);

  const title = t('components.aiAssistantWidget.title');
  const selectedCv = useMemo(
    () => cvOptions.find((cv) => String(cv.id) === String(selectedCvId)) || null,
    [cvOptions, selectedCvId]
  );
  const attachedCvPreview = useMemo(() => {
    if (pendingUploadFile) {
      return {
        name: pendingUploadFile.name,
        subLabel: t('components.aiAssistantWidget.attachment.uploadedFromDevice'),
        source: 'upload'
      };
    }
    if (selectedCv) {
      return {
        name: selectedCv.name,
        subLabel: selectedCv.isOnline
          ? t('components.aiAssistantWidget.attachment.storedOnlineCv')
          : t('components.aiAssistantWidget.attachment.storedUploadedCv'),
        source: 'stored'
      };
    }
    return null;
  }, [pendingUploadFile, selectedCv, t]);

  const busy = loading || uploading;
  const activeChatUserId = Number(activeChatUser?.userId || 0) || null;
  const showFloatingUnreadBadge = unreadConversations > 0 && !chatOpen;

  const requireLogin = (message = t('components.aiAssistantWidget.errors.loginRequiredAssistant')) => {
    const token = getToken();
    if (!token) {
      notify({ type: 'error', message });
      return false;
    }
    return true;
  };

  const scrollToBottom = () => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  const scrollThreadToBottom = () => {
    const el = threadListRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  const isThreadNearBottom = () => {
    const el = threadListRef.current;
    if (!el) return true;
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    return remaining <= THREAD_SCROLL_BOTTOM_THRESHOLD_PX;
  };

  const emitMessageRefresh = () => {
    window.dispatchEvent(new Event('jobfinder:messages-force-refresh'));
  };

  const clearAiHistory = async () => {
    if (busy) return;

    const confirmed = await requestConfirm({
      type: 'warning',
      title: t('components.aiAssistantWidget.clearHistory.title'),
      message: t('components.aiAssistantWidget.clearHistory.message'),
      confirmText: t('components.aiAssistantWidget.clearHistory.confirmText'),
      cancelText: t('components.aiAssistantWidget.clearHistory.cancelText')
    });

    if (!confirmed) return;

    setMessages(buildInitialAiMessages(t));
    setInput('');
    setPendingUploadFile(null);
    setSelectedCvId('');
    notify({ type: 'success', message: t('components.aiAssistantWidget.clearHistory.success') });
    setTimeout(scrollToBottom, 0);
  };

  const apiFetch = async (path, options = {}) => {
    const token = getToken();
    const headers = {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
    const res = await fetch(path, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.success === false) {
      const msg = data?.error || `Request failed (${res.status})`;
      throw new Error(msg);
    }
    return data;
  };

  const loadUserCvs = useCallback(async (showErrorToast = true) => {
    const userId = getUserId();
    const token = getToken();

    if (!userId || !token) {
      setCvOptions([]);
      setSelectedCvId('');
      return [];
    }

    setCvLoading(true);
    try {
      const response = await fetch(`/api/cvs?userId=${encodeURIComponent(userId)}`);
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || t('components.aiAssistantWidget.errors.loadCvListFailed'));
      }

      const nextOptions = (Array.isArray(data?.cvs) ? data.cvs : [])
        .map((cv, index) => {
          const id = cv?.id || cv?.cvId || cv?.MaCV || `cv-${index}`;
          const name = String(cv?.name || cv?.TenCV || cv?.title || t('components.aiAssistantWidget.cvModal.defaultCvName')).trim();
          const refUrl = String(cv?.fileUrl || cv?.fileAbsoluteUrl || '').split('?')[0].toLowerCase();
          const isOnline = refUrl.endsWith('.html');
          return {
            id: String(id),
            name,
            isOnline,
            label: t('components.aiAssistantWidget.cvModal.cvLabelFormat', {
              name,
              type: isOnline
                ? t('components.aiAssistantWidget.cvModal.cvType.online')
                : t('components.aiAssistantWidget.cvModal.cvType.uploaded')
            })
          };
        })
        .filter((cv) => cv.id);

      setCvOptions(nextOptions);
      setSelectedCvId((prev) => (nextOptions.some((cv) => cv.id === String(prev)) ? String(prev) : ''));

      return nextOptions;
    } catch (err) {
      setCvOptions([]);
      setSelectedCvId('');
      if (showErrorToast) {
        notify({ type: 'error', message: err.message || t('components.aiAssistantWidget.errors.loadStoredCvFailed') });
      }
      return [];
    } finally {
      setCvLoading(false);
    }
  }, [notify, t]);

  const openCvModal = async () => {
    if (!requireLogin(t('components.aiAssistantWidget.errors.loginRequiredChooseCv'))) return;
    setCvModalOpen(true);
    await loadUserCvs(false);
  };

  const chooseStoredCv = (cv) => {
    if (!cv?.id) return;
    setSelectedCvId(String(cv.id));
    setPendingUploadFile(null);
    setCvModalOpen(false);
    notify({
      type: 'success',
      message: t('components.aiAssistantWidget.attachment.selectedCvSuccess', { name: cv.name })
    });
  };

  const clearSelectedCv = () => {
    setSelectedCvId('');
    setPendingUploadFile(null);
    notify({ type: 'success', message: t('components.aiAssistantWidget.attachment.clearedSuccess') });
  };

  const attachUploadedCv = (file) => {
    if (!file || busy) return;

    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (!allowed.includes(file.type)) {
      notify({ type: 'error', message: t('components.aiAssistantWidget.errors.invalidCvFileType') });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notify({ type: 'error', message: t('components.aiAssistantWidget.errors.cvFileTooLarge') });
      return;
    }

    setPendingUploadFile(file);
    setSelectedCvId('');
    setCvModalOpen(false);
    notify({
      type: 'success',
      message: t('components.aiAssistantWidget.attachment.attachedSuccess', { name: file.name })
    });
  };

  const refreshUnreadCount = async ({ silent = true } = {}) => {
    const token = getToken();
    if (!token) {
      setUnreadConversations(0);
      void syncAppIconBadge(0);
      return 0;
    }

    try {
      const data = await apiFetch('/api/messages/unread-count');
      const count = Math.max(0, Number(data?.count || 0));
      setUnreadConversations(count);
      void syncAppIconBadge(count);
      return count;
    } catch (err) {
      if (!silent) {
        console.log('Could not fetch unread count:', err.message);
      }
      return 0;
    }
  };

  const refreshInbox = async ({ silent = false, showErrorToast = !silent } = {}) => {
    const token = getToken();
    if (!token) {
      setInbox([]);
      return [];
    }

    if (!silent) setInboxLoading(true);
    try {
      const data = await apiFetch('/api/messages/inbox');
      const list = Array.isArray(data?.inbox) ? data.inbox : [];
      setInbox(list);
      return list;
    } catch (err) {
      // Don't show error if token is invalid - user might not have messages setup
      if (err.message.includes('Invalid token') || err.message.includes('401')) {
        console.log('Message inbox not available:', err.message);
      } else if (showErrorToast) {
        notify({ type: 'error', message: err.message || t('components.aiAssistantWidget.errors.loadInboxFailed') });
      }
      return [];
    } finally {
      if (!silent) setInboxLoading(false);
    }
  };

  const hasThreadChanged = (prev, next) => {
    if (!Array.isArray(prev) || !Array.isArray(next)) return true;
    if (prev.length !== next.length) return true;

    const prevLast = prev[prev.length - 1];
    const nextLast = next[next.length - 1];
    if (!prevLast && !nextLast) return false;

    return (
      String(prevLast?.id || '') !== String(nextLast?.id || '')
      || String(prevLast?.createdAt || '') !== String(nextLast?.createdAt || '')
      || String(prevLast?.content || '') !== String(nextLast?.content || '')
    );
  };

  const openConversation = async (user, { markRead = true, silent = false, refreshSidebar = true, refreshUnread = true } = {}) => {
    if (!user?.userId) return;

    const shouldAutoScroll = !silent || isThreadNearBottom();
    setActiveChatUser((prev) => (Number(prev?.userId || 0) === Number(user.userId) ? prev : user));
    if (!silent) setThreadLoading(true);
    try {
      const data = await apiFetch(`/api/messages/conversation/${user.userId}`);
      const nextMessages = Array.isArray(data?.messages) ? data.messages : [];
      setThreadMessages((prev) => (hasThreadChanged(prev, nextMessages) ? nextMessages : prev));
      if (shouldAutoScroll) {
        setTimeout(scrollThreadToBottom, 0);
      }

      if (markRead) {
        await apiFetch(`/api/messages/mark-read/${user.userId}`, { method: 'PATCH' });
      }

      const refreshTasks = [];
      if (refreshSidebar) {
        refreshTasks.push(refreshInbox({ silent: true, showErrorToast: false }));
      }
      if (refreshUnread) {
        refreshTasks.push(refreshUnreadCount({ silent: true }));
      }
      await Promise.all(refreshTasks);

      if (markRead) {
        emitMessageRefresh();
      }

      return nextMessages;
    } catch (err) {
      if (!silent) {
        notify({ type: 'error', message: err.message || t('components.aiAssistantWidget.errors.loadConversationFailed') });
      }
      return [];
    } finally {
      if (!silent) setThreadLoading(false);
    }
  };

  const sendChatMessage = async () => {
    const content = chatInput.trim();
    if (!content || !activeChatUser?.userId) return;

    const token = getToken();
    if (!token) {
      notify({ type: 'error', message: t('components.aiAssistantWidget.errors.loginRequiredMessaging') });
      return;
    }

    const myId = getUserId();
    const optimistic = {
      id: `tmp-${Date.now()}`,
      fromUserId: myId,
      toUserId: activeChatUser.userId,
      content,
      createdAt: new Date().toISOString(),
      read: true
    };
    setThreadMessages((prev) => [...prev, optimistic]);
    setChatInput('');
    setTimeout(scrollThreadToBottom, 0);

    try {
      await apiFetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId: activeChatUser.userId, content })
      });

      await Promise.all([
        openConversation(activeChatUser, { markRead: false, silent: true, refreshSidebar: false, refreshUnread: false }),
        refreshInbox({ silent: true, showErrorToast: false }),
        refreshUnreadCount({ silent: true })
      ]);
      emitMessageRefresh();
    } catch (err) {
      notify({ type: 'error', message: err.message || t('components.aiAssistantWidget.errors.sendMessageFailed') });
    }
  };

  const send = async () => {
    const text = input.trim();
    const hasAttachment = Boolean(attachedCvPreview);
    if ((!text && !hasAttachment) || busy) return;

    const userPrompt = text || t('components.aiAssistantWidget.defaultPromptWithAttachment');
    const composedUserMessage = pendingUploadFile
      ? `${userPrompt}\n(${t('components.aiAssistantWidget.attachment.label')}: ${pendingUploadFile.name})`
      : userPrompt;

    // Optimistic append user message
    const nextMessages = [...messages, { role: 'user', content: composedUserMessage }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    if (pendingUploadFile) {
      setUploading(true);
    }

    // Let the UI paint the new message then scroll.
    setTimeout(scrollToBottom, 0);

    try {
      let res;
      if (pendingUploadFile) {
        const userId = getUserId();
        const form = new FormData();
        form.append('cvFile', pendingUploadFile);
        if (userId) form.append('userId', userId);
        form.append('question', userPrompt);

        res = await fetch('/api/ai/chat/cv-file', {
          method: 'POST',
          body: form
        });
      } else if (selectedCvId) {
        const token = getToken();
        if (!token) {
          throw new Error(t('components.aiAssistantWidget.errors.loginRequiredAnalyzeStoredCv'));
        }

        res = await fetch('/api/ai/chat/cv-stored', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            cvId: Number(selectedCvId),
            question: userPrompt,
            messages: nextMessages.slice(-20)
          })
        });
      } else {
        const userId = getUserId();
        res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // Send conversation context so AI can answer follow-ups naturally
          body: JSON.stringify({
            mode: 'general',
            userId,
            messages: nextMessages.slice(-20)
          })
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(toFriendlyAiError(data.error || t('components.aiAssistantWidget.errors.callAiFailed'), t));
      }

      const safeReply = normalizeAssistantReply(data.reply || '', t);
      setMessages((prev) => [...prev, { role: 'assistant', content: safeReply || t('components.aiAssistantWidget.okFallback') }]);
      if (pendingUploadFile) {
        setPendingUploadFile(null);
      }
      setTimeout(scrollToBottom, 0);
    } catch (err) {
      const friendlyMessage = toFriendlyAiError(err.message || t('components.aiAssistantWidget.errors.callAiFailed'), t);
      notify({ type: 'error', message: friendlyMessage });
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: isProviderBusyError(friendlyMessage)
            ? t('components.aiAssistantWidget.errors.providerBusyRetry')
            : t('components.aiAssistantWidget.errors.processingFailedRetry')
        }
      ]);
      setTimeout(scrollToBottom, 0);
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  useEffect(() => {
    const onToggle = () => setOpen((v) => !v);
    const onOpen = () => setOpen(true);
    const onClose = () => setOpen(false);

    window.addEventListener('aiw:toggle', onToggle);
    window.addEventListener('aiw:open', onOpen);
    window.addEventListener('aiw:close', onClose);

    return () => {
      window.removeEventListener('aiw:toggle', onToggle);
      window.removeEventListener('aiw:open', onOpen);
      window.removeEventListener('aiw:close', onClose);
    };
  }, []);

  useEffect(() => {
    const onBridgeUnreadUpdated = (event) => {
      const nextCount = Math.max(0, Number(event?.detail?.unreadConversations || 0));
      const nextInbox = Array.isArray(event?.detail?.inbox) ? event.detail.inbox : null;

      setUnreadConversations(nextCount);
      if (nextInbox) {
        setInbox(nextInbox);
      }
      void syncAppIconBadge(nextCount);
    };

    window.addEventListener('jobfinder:messages-unread-updated', onBridgeUnreadUpdated);
    return () => {
      window.removeEventListener('jobfinder:messages-unread-updated', onBridgeUnreadUpdated);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    loadUserCvs(false);
  }, [open, loadUserCvs]);

  useEffect(() => {
    if (open) return;
    setCvModalOpen(false);
  }, [open]);

  useEffect(() => {
    if (!chatOpen) return;

    let cancelled = false;

    (async () => {
      const token = getToken();
      if (!token) {
        // Don't show error - user might not have logged in yet
        setChatOpen(false);
        return;
      }

      const list = await refreshInbox({ silent: false, showErrorToast: true });
      if (cancelled) return;

      if (!activeChatUserId && list.length > 0) {
        await openConversation(list[0], { markRead: true, silent: false, refreshSidebar: false, refreshUnread: false });
      } else if (activeChatUserId) {
        const currentUser = list.find((item) => Number(item.userId) === Number(activeChatUserId)) || activeChatUser;
        if (currentUser) {
          await openConversation(currentUser, { markRead: true, silent: false, refreshSidebar: false, refreshUnread: false });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatOpen, activeChatUserId]);

  useEffect(() => {
    if (!chatOpen) return undefined;

    let cancelled = false;

    const pollRealtimeChat = async () => {
      if (chatPollInFlightRef.current || document.hidden) return;
      chatPollInFlightRef.current = true;
      try {
        const list = await refreshInbox({ silent: true, showErrorToast: false });
        if (cancelled) return;

        if (activeChatUserId) {
          const currentUser = list.find((item) => Number(item.userId) === Number(activeChatUserId)) || activeChatUser;
          if (currentUser) {
            const shouldMarkRead = Number(currentUser?.unread || 0) > 0;
            await openConversation(currentUser, {
              markRead: shouldMarkRead,
              silent: true,
              refreshSidebar: false,
              refreshUnread: false
            });
          }
        }
      } catch {
        // keep polling silently while chat is open
      } finally {
        chatPollInFlightRef.current = false;
      }
    };

    pollRealtimeChat();
    const intervalId = window.setInterval(pollRealtimeChat, CHAT_REALTIME_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      chatPollInFlightRef.current = false;
      window.clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatOpen, activeChatUserId]);

  return (
    <div className={`aiw-root ${open ? 'aiw-open' : ''}`}>
      {!open && chatOpen && (
        <div className="aiw-chat-panel" role="dialog" aria-label={t('components.aiAssistantWidget.chat.dialogAriaLabel')}>
          <div className="aiw-header">
            <div className="aiw-title">
              <div className="aiw-avatar">💬</div>
              <div>
                <div className="aiw-title-text">{t('components.aiAssistantWidget.chat.title')}</div>
                <div className="aiw-title-sub">{t('components.aiAssistantWidget.chat.subtitle')}</div>
              </div>
            </div>
            <button type="button" className="aiw-close" onClick={() => setChatOpen(false)} aria-label={t('components.aiAssistantWidget.common.close')}>
              <i className="bi bi-x"></i>
            </button>
          </div>

          <div className="aiw-chat-body">
            <div className="aiw-chat-inbox">
              {inboxLoading ? (
                <div style={{ padding: 12, color: 'rgba(15, 23, 42, 0.7)', fontWeight: 700 }}>{t('components.aiAssistantWidget.chat.loading')}</div>
              ) : inbox.length === 0 ? (
                <div style={{ padding: 12, color: 'rgba(15, 23, 42, 0.7)', fontWeight: 700 }}>{t('components.aiAssistantWidget.chat.noConversation')}</div>
              ) : (
                inbox.map((c) => (
                  <button
                    key={c.userId}
                    type="button"
                    className={`aiw-inbox-item ${activeChatUser?.userId === c.userId ? 'active' : ''}`}
                    onClick={() => openConversation(c)}
                  >
                    <div className="aiw-inbox-top">
                      <div className="aiw-inbox-name">{c.name}</div>
                      {c.unread > 0 && <div className="aiw-inbox-unread">{c.unread}</div>}
                    </div>
                    <div className="aiw-inbox-last">{c.lastMessage}</div>
                  </button>
                ))
              )}
            </div>

            <div className="aiw-chat-thread">
              <div className="aiw-thread-list" ref={threadListRef}>
                {!activeChatUser ? (
                  <div style={{ color: 'rgba(15, 23, 42, 0.7)', fontWeight: 700 }}>{t('components.aiAssistantWidget.chat.selectConversation')}</div>
                ) : threadLoading ? (
                  <div style={{ color: 'rgba(15, 23, 42, 0.7)', fontWeight: 700 }}>{t('components.aiAssistantWidget.chat.loadingMessages')}</div>
                ) : threadMessages.length === 0 ? (
                  <div style={{ color: 'rgba(15, 23, 42, 0.7)', fontWeight: 700 }}>{t('components.aiAssistantWidget.chat.noMessages')}</div>
                ) : (
                  threadMessages.map((m) => {
                    const myId = getUserId();
                    const isMe = myId != null && String(m.fromUserId) === String(myId);
                    const dt = m.createdAt ? new Date(m.createdAt) : null;
                    const timeText = dt && !Number.isNaN(dt.getTime()) ? dt.toLocaleString() : '';
                    return (
                      <div key={m.id} className={`aiw-thread-msg ${isMe ? 'me' : 'other'}`}>
                        <div>
                          <div className="aiw-thread-bubble">{renderTextWithLinks(m.content)}</div>
                          {timeText && <div className="aiw-thread-time">{timeText}</div>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="aiw-thread-input">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') sendChatMessage();
                  }}
                  placeholder={activeChatUser
                    ? t('components.aiAssistantWidget.chat.inputPlaceholderWithName', { name: activeChatUser.name })
                    : t('components.aiAssistantWidget.chat.inputPlaceholderNoConversation')}
                  disabled={!activeChatUser}
                />
                <button type="button" onClick={sendChatMessage} disabled={!activeChatUser || !chatInput.trim()}>
                  {t('components.aiAssistantWidget.chat.sendButton')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {open && (
        <div className="aiw-panel" role="dialog" aria-label={t('components.aiAssistantWidget.assistantDialogAriaLabel')}>
          <div className="aiw-header">
            <div className="aiw-title">
              <div className="aiw-avatar">🤖</div>
              <div>
                <div className="aiw-title-text">{title}</div>
                <div className="aiw-title-sub">{t('components.aiAssistantWidget.assistantSubtitle')}</div>
              </div>
            </div>
            <div className="aiw-header-actions">
              <button
                type="button"
                className="aiw-clear"
                onClick={clearAiHistory}
                aria-label={t('components.aiAssistantWidget.clearHistory.buttonLabel')}
                disabled={busy || messages.length <= 1}
              >
                <i className="bi bi-trash3"></i>
                <span>{t('components.aiAssistantWidget.clearHistory.buttonText')}</span>
              </button>
              <button type="button" className="aiw-close" onClick={() => setOpen(false)} aria-label={t('components.aiAssistantWidget.common.close')}>
                <i className="bi bi-x"></i>
              </button>
            </div>
          </div>

          <div className="aiw-messages" ref={listRef}>
            {messages.map((m, idx) => (
              <div key={idx} className={`aiw-msg ${m.role === 'user' ? 'user' : 'assistant'}`}>
                <div className="aiw-bubble">{renderTextWithLinks(m.content)}</div>
              </div>
            ))}
            {uploading && (
              <div className="aiw-msg assistant">
                <div className="aiw-bubble aiw-typing">{t('components.aiAssistantWidget.status.analyzingCv')}</div>
              </div>
            )}
            {loading && (
              <div className="aiw-msg assistant">
                <div className="aiw-bubble aiw-typing">{t('components.aiAssistantWidget.status.replying')}</div>
              </div>
            )}
          </div>

          {attachedCvPreview && (
            <div className="aiw-attachment-chip">
              <div className="aiw-attachment-icon">
                <i className="bi bi-file-earmark-text"></i>
              </div>
              <div className="aiw-attachment-content">
                <div className="aiw-attachment-name">{attachedCvPreview.name}</div>
                <div className="aiw-attachment-sub">{attachedCvPreview.subLabel}</div>
              </div>
              <button type="button" className="aiw-attachment-remove" onClick={clearSelectedCv} disabled={busy}>
                <i className="bi bi-x"></i>
              </button>
            </div>
          )}

          <div className="aiw-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') send();
              }}
              placeholder={attachedCvPreview
                ? t('components.aiAssistantWidget.input.placeholderWithAttachment')
                : t('components.aiAssistantWidget.input.placeholder')}
              disabled={busy}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) attachUploadedCv(file);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              className={`aiw-upload-btn ${attachedCvPreview ? 'is-attached' : ''}`}
              onClick={openCvModal}
              disabled={busy}
              title={attachedCvPreview
                ? t('components.aiAssistantWidget.attachment.currentAttachmentTitle', { name: attachedCvPreview.name })
                : t('components.aiAssistantWidget.attachment.attachCvTitle')}
            >
              <i className="bi bi-paperclip"></i>
            </button>
            <button type="button" onClick={send} disabled={busy || (!input.trim() && !attachedCvPreview)}>
              <i className="bi bi-send"></i>
            </button>
          </div>

          {cvModalOpen && (
            <div
              className="aiw-cv-modal-backdrop"
              role="dialog"
              aria-modal="true"
              aria-label={t('components.aiAssistantWidget.cvModal.ariaLabel')}
              onClick={() => setCvModalOpen(false)}
            >
              <div className="aiw-cv-modal" onClick={(e) => e.stopPropagation()}>
                <div className="aiw-cv-modal-head">
                  <h6>{t('components.aiAssistantWidget.cvModal.title')}</h6>
                  <button type="button" className="aiw-cv-modal-close" onClick={() => setCvModalOpen(false)}>
                    <i className="bi bi-x"></i>
                  </button>
                </div>

                <div className="aiw-cv-modal-actions">
                  <button
                    type="button"
                    className={`aiw-cv-modal-btn ${cvLoading ? 'loading' : ''}`}
                    onClick={() => loadUserCvs(true)}
                    disabled={busy || cvLoading}
                  >
                    <i className="bi bi-arrow-clockwise"></i>
                    <span>{t('components.aiAssistantWidget.cvModal.reloadCv')}</span>
                  </button>
                  <button
                    type="button"
                    className="aiw-cv-modal-btn primary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={busy}
                  >
                    <i className="bi bi-upload"></i>
                    <span>{t('components.aiAssistantWidget.cvModal.uploadFromDevice')}</span>
                  </button>
                </div>

                <div className="aiw-cv-modal-body">
                  {cvLoading ? (
                    <div className="aiw-cv-empty">{t('components.aiAssistantWidget.cvModal.loadingCvList')}</div>
                  ) : cvOptions.length === 0 ? (
                    <div className="aiw-cv-empty">{t('components.aiAssistantWidget.cvModal.noStoredCv')}</div>
                  ) : (
                    <div className="aiw-cv-list">
                      {cvOptions.map((cv) => {
                        const active = String(selectedCvId) === String(cv.id);
                        return (
                          <button
                            key={cv.id}
                            type="button"
                            className={`aiw-cv-item ${active ? 'active' : ''}`}
                            onClick={() => chooseStoredCv(cv)}
                          >
                            <div className="aiw-cv-item-title">{cv.name}</div>
                            <div className="aiw-cv-item-meta">{cv.isOnline
                              ? t('components.aiAssistantWidget.cvModal.cvType.online')
                              : t('components.aiAssistantWidget.cvModal.cvType.uploaded')}</div>
                            <div className="aiw-cv-item-state">{active
                              ? t('components.aiAssistantWidget.cvModal.selected')
                              : t('components.aiAssistantWidget.cvModal.selectThisCv')}</div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="aiw-cv-modal-foot">
                  {attachedCvPreview ? (
                    <div className="aiw-cv-selected-note">
                      {t('components.aiAssistantWidget.cvModal.usingCv', { name: attachedCvPreview.name })}
                    </div>
                  ) : (
                    <div className="aiw-cv-selected-note">{t('components.aiAssistantWidget.cvModal.noCvSelected')}</div>
                  )}
                  <button type="button" className="aiw-cv-clear-btn" onClick={clearSelectedCv} disabled={!attachedCvPreview || busy}>
                    {t('components.aiAssistantWidget.cvModal.clearCv')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!open && (
        <div
          className={`aiw-pill ${pillExpanded ? 'expanded' : 'collapsed'}`}
          role="complementary"
          aria-label={t('components.aiAssistantWidget.pill.shortcutsAriaLabel')}
        >
          {pillExpanded ? (
            <>
              <button
                type="button"
                className="aiw-pill-btn"
                onClick={() => {
                  if (!requireLogin()) return;
                  setOpen(true);
                  setPillExpanded(true);
                }}
                aria-label={t('components.aiAssistantWidget.pill.openAi')}
                title={t('components.aiAssistantWidget.pill.openAi')}
              >
                <i className="bi bi-robot" />
              </button>
              <button
                type="button"
                className="aiw-pill-btn"
                onClick={() => navigate('/jobs/saved')}
                aria-label={t('components.aiAssistantWidget.pill.savedJobs')}
                title={t('components.aiAssistantWidget.pill.savedJobs')}
              >
                <i className="bi bi-bookmark" />
              </button>
              <button
                type="button"
                className="aiw-pill-btn aiw-pill-btn-chat"
                aria-label={t('components.aiAssistantWidget.pill.askAi')}
                title={t('components.aiAssistantWidget.pill.messages')}
                onClick={() => {
                  if (!requireLogin(t('components.aiAssistantWidget.errors.loginRequiredViewMessages'))) return;
                  setChatOpen((v) => !v);
                }}
              >
                <i className="bi bi-chat-dots" />
                {showFloatingUnreadBadge && <span className="aiw-badge">{unreadConversations}</span>}
              </button>
              <button
                type="button"
                className="aiw-pill-caret"
                onClick={() => setPillExpanded(false)}
                aria-label={t('components.aiAssistantWidget.pill.collapse')}
                title={t('components.aiAssistantWidget.pill.collapse')}
              >
                <i className="bi bi-caret-up-fill" />
              </button>
            </>
          ) : (
            <button
              type="button"
              className="aiw-pill-caret aiw-pill-caret-alone"
              onClick={() => setPillExpanded(true)}
              aria-label={t('components.aiAssistantWidget.pill.expand')}
              title={t('components.aiAssistantWidget.pill.expand')}
            >
              <i className="bi bi-caret-down-fill" />
              {showFloatingUnreadBadge && <span className="aiw-badge">{unreadConversations}</span>}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AIAssistantWidget;
