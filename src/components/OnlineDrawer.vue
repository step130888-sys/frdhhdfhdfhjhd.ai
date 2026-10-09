<template>
  <div>
    <!-- Backdrop -->
    <div
      v-if="isOnlineDrawerOpen"
      @click="toggleOnlineDrawer"
      class="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-50 transition-opacity"
    ></div>

    <!-- Sliding Panel -->
    <div
      class="fixed top-0 right-0 h-full w-80 md:w-96 bg-white dark:bg-[#0a0a0e] border-l border-slate-200 dark:border-white/10 z-50 shadow-2xl flex flex-col transform transition-transform duration-300 ease-out"
      :class="isOnlineDrawerOpen ? 'translate-x-0' : 'translate-x-full'"
    >
      <!-- Header -->
      <div class="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-[#101016] transition-colors">
        <div class="flex items-center space-x-2.5">
          <span class="relative flex h-3 w-3">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
          <div>
            <h3 class="text-sm font-black text-slate-800 dark:text-white tracking-wide">Кто сейчас в сети</h3>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">Активность за последние 5 минут</p>
          </div>
        </div>

        <button
          @click="toggleOnlineDrawer"
          class="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 transition-all cursor-pointer"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Users List -->
      <div class="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50/50 dark:bg-transparent">
        <div v-if="onlineUsers.length === 0" class="text-center py-12 text-slate-400 text-xs">
          Никого нет в сети
        </div>

        <router-link
          v-for="u in onlineUsers"
          :key="u.id"
          :to="`/profile/${u.id}`"
          @click="toggleOnlineDrawer"
          class="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-[#14141c] hover:bg-orange-50/20 dark:hover:bg-[#1a1a24] border border-slate-200 dark:border-white/10 hover:border-orange-500 dark:hover:border-[#fcb4d5] shadow-xs transition-all group"
        >
          <div class="flex items-center space-x-3 min-w-0">
            <!-- Avatar with pulse ring -->
            <div class="relative flex-shrink-0">
              <div class="w-10 h-10 rounded-full overflow-hidden bg-orange-500/15 dark:bg-[#fcb4d5]/15 border border-orange-500/30 dark:border-[#fcb4d5]/30 flex items-center justify-center text-xs font-black">
                <img v-if="u.avatar_url" :src="u.avatar_url" :alt="u.name" class="w-full h-full object-cover">
                <span v-else class="text-orange-600 dark:text-[#fcb4d5]">{{ u.name.charAt(0) }}</span>
              </div>
              <span class="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-[#14141c] rounded-full"></span>
            </div>

            <!-- Name and Workshop -->
            <div class="truncate">
              <div class="text-xs font-bold text-slate-800 dark:text-white group-hover:text-orange-600 dark:group-hover:text-[#fcb4d5] transition-colors truncate">
                {{ u.name }}
              </div>
              <div class="flex items-center space-x-1.5 mt-0.5">
                <span class="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{{ u.role }}</span>
                <!-- Level Badge -->
                <span
                  v-if="u.access_level >= 4"
                  class="text-[9px] font-black px-1.5 py-0.2 rounded bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/30"
                >
                  Админ
                </span>
                <span
                  v-else-if="u.access_level === 3"
                  class="text-[9px] font-black px-1.5 py-0.2 rounded bg-orange-500/15 text-orange-600 dark:text-[#fcb4d5] border border-orange-500/30 dark:border-[#fcb4d5]/30"
                >
                  Руководство
                </span>
                <span
                  v-else-if="u.access_level === 2"
                  class="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30"
                >
                  Глава цеха
                </span>
              </div>
            </div>
          </div>

          <!-- Relative Time -->
          <div class="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-lg flex-shrink-0 border border-emerald-200 dark:border-emerald-500/20">
            {{ u.relative_time }}
          </div>
        </router-link>
      </div>

      <!-- Footer Info -->
      <div class="p-3 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#101016] text-center text-[11px] text-slate-500 font-medium transition-colors">
        Всего участников в сети: <strong class="text-slate-800 dark:text-white">{{ onlineUsers.length }}</strong>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useAuthStore } from '../stores/auth';

const {
  isOnlineDrawerOpen,
  toggleOnlineDrawer,
  onlineUsers
} = useAuthStore();
</script>
