<template>
  <div class="min-h-screen flex flex-col transition-colors duration-200">
    <!-- Navbar (Desktop top + Mobile bottom) -->
    <Navbar />

    <!-- Ambient Glass Lighting Orbs (Fixed background refraction for Liquid Glass) -->
    <div class="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <div class="absolute -top-32 left-1/4 w-96 h-96 rounded-full bg-orange-400/10 dark:bg-[#fcb4d5]/10 blur-3xl"></div>
      <div class="absolute top-1/3 -right-20 w-[420px] h-[420px] rounded-full bg-amber-400/8 dark:bg-purple-600/10 blur-3xl"></div>
      <div class="absolute bottom-10 left-10 w-80 h-80 rounded-full bg-orange-300/10 dark:bg-[#fcb4d5]/8 blur-3xl"></div>
    </div>

    <!-- Main Content Area with safe mobile bottom margin -->
    <main class="flex-1 pb-24 md:pb-8 relative z-10 overflow-x-hidden">
      <router-view v-slot="{ Component, route }">
        <transition name="page-swipe" mode="out-in">
          <component :is="Component" :key="route.path" />
        </transition>
      </router-view>
    </main>

    <!-- Online Drawer -->
    <OnlineDrawer />

    <!-- Global Floating Notification Toast -->
    <transition name="toast">
      <div
        v-if="notification"
        class="fixed bottom-20 md:bottom-6 right-4 md:right-6 left-4 md:left-auto z-50 max-w-sm p-4 rounded-2xl shadow-2xl text-xs font-bold flex items-center space-x-3 border backdrop-blur-xl"
        :class="getToastClasses(notification.type)"
      >
        <span class="flex-shrink-0">
          <svg v-if="notification.type === 'error'" class="w-4 h-4 text-rose-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <svg v-else-if="notification.type === 'warning'" class="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <svg v-else-if="notification.type === 'info'" class="w-4 h-4 text-orange-500 dark:text-[#fcb4d5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <svg v-else class="w-4 h-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </span>
        <span class="leading-relaxed">{{ notification.message }}</span>
      </div>
    </transition>

    <!-- Footer (Hidden on mobile when nav bar is present, visible on desktop) -->
    <footer class="mt-auto py-6 border-t border-slate-200 dark:border-white/10 bg-white/70 dark:bg-[#07070a] text-center text-xs text-slate-500 dark:text-slate-400 hidden md:block transition-colors">
      <div class="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div class="flex items-center space-x-2">
          <span class="font-bold text-slate-700 dark:text-slate-300">Медиацентр «СМС СГТУ»</span>
          <span>•</span>
          <span class="text-slate-500 dark:text-slate-400">Фото • Дизайн • Видео • Моушен • СММ</span>
        </div>
        <div class="text-[11px] text-slate-400 dark:text-slate-600 font-mono">
          VUE 3 + Express + SQLite WAL + Bots • 2026
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue';
import Navbar from './components/Navbar.vue';
import OnlineDrawer from './components/OnlineDrawer.vue';
import { useAuthStore } from './stores/auth';
import { useThemeStore } from './stores/theme';

const { notification, fetchMe, heartbeat } = useAuthStore();
const { initTheme } = useThemeStore();
let heartbeatInterval = null;

const getToastClasses = (type) => {
  switch (type) {
    case 'error':
      return 'bg-white dark:bg-red-950/90 text-rose-700 dark:text-red-200 border-rose-300 dark:border-red-500/40 shadow-rose-500/10 dark:shadow-red-900/30';
    case 'warning':
      return 'bg-white dark:bg-amber-950/90 text-amber-700 dark:text-amber-200 border-amber-300 dark:border-amber-500/40 shadow-amber-500/10 dark:shadow-amber-900/30';
    case 'info':
      return 'bg-white dark:bg-[#14141c]/95 text-orange-700 dark:text-[#fcb4d5] border-orange-300 dark:border-[#fcb4d5]/40 shadow-orange-500/10 dark:shadow-[#fcb4d5]/20';
    case 'success':
    default:
      return 'bg-white dark:bg-[#14141c]/95 text-emerald-700 dark:text-emerald-200 border-emerald-300 dark:border-emerald-500/40 shadow-emerald-500/10 dark:shadow-emerald-900/30';
  }
};

const handleVisibilityChange = () => {
  if (document.hidden) {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  } else {
    heartbeat();
    if (!heartbeatInterval) {
      heartbeatInterval = setInterval(heartbeat, 60000);
    }
  }
};

onMounted(() => {
  initTheme();
  fetchMe();
  // 60-second online heartbeat (pauses on inactive tabs)
  heartbeatInterval = setInterval(heartbeat, 60000);
  document.addEventListener('visibilitychange', handleVisibilityChange);
});

onUnmounted(() => {
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
});
</script>

<style>
.toast-enter-active {
  transition: transform 220ms var(--ease-out), opacity 200ms ease-out;
  will-change: transform, opacity;
}
.toast-leave-active {
  transition: transform 160ms var(--ease-out), opacity 140ms ease-in;
  will-change: transform, opacity;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(16px) scale(0.96);
}
</style>
