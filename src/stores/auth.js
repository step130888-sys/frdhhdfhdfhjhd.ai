import { reactive, computed } from 'vue';

const state = reactive({
  user: null,
  loading: true,
  onlineUsers: [],
  onlineCount: 0,
  isOnlineDrawerOpen: false,
  notification: null
});

export const useAuthStore = () => {
  const isLoggedIn = computed(() => Boolean(state.user && state.user.id));
  const isApproved = computed(() => Boolean(state.user && state.user.is_approved));
  const accessLevel = computed(() => (state.user ? state.user.access_level : 0));
  const hasTeamChat = computed(() => accessLevel.value >= 2);
  const isLeader = computed(() => accessLevel.value >= 3);
  const isWorkshopHead = computed(() => accessLevel.value === 2);
  const isSuperAdmin = computed(() => accessLevel.value >= 4);
  const isGuardian = computed(() => accessLevel.value >= 5);
  const isRootGuardian = computed(() => Boolean(state.user && state.user.username === 'admin'));
  const canCreateTasks = computed(() => {
    if (!state.user) return false;
    return isLeader.value || Boolean(state.user.can_create_tasks);
  });

  const showNotification = (message, type = 'success') => {
    state.notification = { message, type };
    setTimeout(() => {
      state.notification = null;
    }, 4500);
  };

  const fetchMe = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      state.user = data.user;
      if (data.online_count !== undefined) {
        state.onlineCount = data.online_count;
      }
    } catch (err) {
      console.error('Failed to fetch auth state:', err);
      state.user = null;
    } finally {
      state.loading = false;
    }
  };

  const login = async (username, password, rememberMe = true) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, remember_me: rememberMe })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Ошибка входа');
    }
    state.user = data.user;
    showNotification(`С возвращением, ${data.user.name}!`);
    return data;
  };

  const setUser = (userData) => {
    state.user = userData;
    if (userData) {
      showNotification(`С возвращением, ${userData.name}!`);
    }
  };

  const register = async (form) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Ошибка регистрации');
    }
    showNotification(data.message);
    return data;
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    state.user = null;
    showNotification('Вы вышли из системы.', 'info');
  };

  const fetchOnlineUsers = async () => {
    try {
      const res = await fetch('/api/online/users');
      const data = await res.json();
      state.onlineUsers = data.users || [];
      state.onlineCount = data.count || 0;
    } catch (e) {
      console.error('Failed to fetch online users:', e);
    }
  };

  const heartbeat = async () => {
    if (!isLoggedIn.value) return;
    try {
      await fetch('/api/online/heartbeat', { method: 'POST' });
    } catch (e) {}
  };

  const toggleOnlineDrawer = () => {
    state.isOnlineDrawerOpen = !state.isOnlineDrawerOpen;
    if (state.isOnlineDrawerOpen) {
      fetchOnlineUsers();
    }
  };

  return {
    state,
    user: computed(() => state.user),
    loading: computed(() => state.loading),
    isLoggedIn,
    isApproved,
    accessLevel,
    hasTeamChat,
    isLeader,
    isWorkshopHead,
    isSuperAdmin,
    isGuardian,
    isRootGuardian,
    canCreateTasks,
    onlineUsers: computed(() => state.onlineUsers),
    onlineCount: computed(() => state.onlineCount),
    isOnlineDrawerOpen: computed(() => state.isOnlineDrawerOpen),
    notification: computed(() => state.notification),
    showNotification,
    fetchMe,
    login,
    setUser,
    register,
    logout,
    fetchOnlineUsers,
    heartbeat,
    toggleOnlineDrawer
  };
};
