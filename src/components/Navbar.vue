<template>
  <div>
    <!-- Top Navbar -->
    <header class="bg-white/70 dark:bg-[#07080B]/75 backdrop-blur-3xl border-b border-black/[0.05] dark:border-white/[0.08] sticky top-0 z-40 transition-colors shadow-2xs">
      <div class="max-w-7xl mx-auto px-3 sm:px-6 h-16 sm:h-17 flex items-center justify-between gap-3 sm:gap-6 flex-nowrap w-full">
        
        <!-- Left: Brand & Logo -->
        <router-link to="/content-plan" class="flex items-center space-x-2.5 sm:space-x-3 shrink-0 group">
          <div class="relative flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
            <img
              src="/uploads/liquid_glass_logo.png"
              alt="СМС СГТУ"
              class="h-7 sm:h-8 md:h-9 w-auto object-contain filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.12)] dark:drop-shadow-[0_2px_14px_rgba(255,255,255,0.22)] select-none"
            >
          </div>
          <div class="flex flex-col justify-center">
            <div class="flex items-center space-x-1.5 leading-none">
              <span class="font-bold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white whitespace-nowrap">СМС СГТУ</span>
              <span class="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-orange-500/10 dark:bg-[#fcb4d5]/15 text-orange-600 dark:text-[#fcb4d5] uppercase tracking-wider hidden sm:inline-block">МЕДИА</span>
            </div>
            <span class="text-[10px] text-slate-500 dark:text-slate-400 font-medium tracking-normal hidden lg:block leading-none mt-1">Студенческий медиацентр</span>
          </div>
        </router-link>

        <!-- Center: Navigation Links (Wide Apple Liquid Glass Dock) -->
        <nav v-if="isLoggedIn" ref="navDockRef" class="relative hidden md:flex items-center gap-1.5 p-1.5 rounded-2xl glass-pill-dock shrink-0">
          <!-- Animated Sliding Indicator: Transparent Liquid Frosted Glass in both themes -->
          <div
            class="absolute top-0 left-0 rounded-xl pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] z-0 will-change-transform bg-white/55 dark:bg-[#151620]/80 shadow-[inset_0_1.5px_1.5px_rgba(255,255,255,0.95),0_4px_16px_-2px_rgba(249,115,22,0.18)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),0_4px_20px_rgba(252,180,213,0.16)] border border-orange-500/30 dark:border-[#fcb4d5]/35 backdrop-blur-2xl"
            :style="navIndicatorStyle"
          >
            <div class="absolute inset-0 rounded-xl bg-gradient-to-b from-white/75 via-white/15 to-orange-500/[0.04] dark:from-white/15 dark:to-transparent pointer-events-none"></div>
          </div>

          <router-link
            to="/content-plan"
            class="relative z-10 px-4.5 py-2 sm:px-5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors duration-300 ease-out whitespace-nowrap flex items-center justify-center gap-2 min-w-[120px] active:scale-[0.97]"
            :class="$route.path === '/content-plan' ? 'text-orange-600 dark:text-[#fcb4d5]' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/[0.04]'"
          >
            <svg class="w-4 h-4 shrink-0" :class="$route.path === '/content-plan' ? 'text-orange-500 dark:text-[#fcb4d5]' : 'text-slate-400 dark:text-slate-500'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <span class="leading-none text-center">Контент-план</span>
          </router-link>
          
          <router-link
            to="/materials"
            class="relative z-10 px-4.5 py-2 sm:px-5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors duration-300 ease-out whitespace-nowrap flex items-center justify-center gap-2 min-w-[110px] active:scale-[0.97]"
            :class="$route.path === '/materials' ? 'text-orange-600 dark:text-[#fcb4d5]' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/[0.04]'"
          >
            <svg class="w-4 h-4 shrink-0" :class="$route.path === '/materials' ? 'text-orange-500 dark:text-[#fcb4d5]' : 'text-slate-400 dark:text-slate-500'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
            </svg>
            <span class="leading-none text-center">Материалы</span>
          </router-link>

          <!-- My Profile for All Participants -->
          <router-link
            v-if="user"
            :to="`/profile/${user.id}`"
            class="relative z-10 px-4.5 py-2 sm:px-5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors duration-300 ease-out whitespace-nowrap flex items-center justify-center gap-2 min-w-[120px] active:scale-[0.97]"
            :class="$route.path === `/profile/${user.id}` ? 'text-orange-600 dark:text-[#fcb4d5]' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/[0.04]'"
          >
            <svg class="w-4 h-4 shrink-0" :class="$route.path === `/profile/${user.id}` ? 'text-orange-500 dark:text-[#fcb4d5]' : 'text-slate-400 dark:text-slate-500'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            <span class="leading-none text-center">Мой профиль</span>
          </router-link>

          <!-- Leadership Level 3-4 -->
          <router-link
            v-if="isLeader"
            to="/management"
            class="relative z-10 px-4.5 py-2 sm:px-5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors duration-300 ease-out whitespace-nowrap flex items-center justify-center gap-2 min-w-[120px] active:scale-[0.97]"
            :class="$route.path === '/management' ? 'text-orange-600 dark:text-[#fcb4d5]' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/[0.04]'"
          >
            <svg class="w-4 h-4 shrink-0" :class="$route.path === '/management' ? 'text-orange-500 dark:text-[#fcb4d5]' : 'text-slate-400 dark:text-slate-500'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
            </svg>
            <span class="leading-none text-center">Руководство</span>
          </router-link>

          <!-- Superadmin Level 4 -->
          <router-link
            v-if="isSuperAdmin"
            to="/admin/users"
            class="relative z-10 px-4.5 py-2 sm:px-5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors duration-300 ease-out whitespace-nowrap flex items-center justify-center gap-2 min-w-[115px] active:scale-[0.97]"
            :class="$route.path === '/admin/users' ? 'text-orange-600 dark:text-[#fcb4d5]' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/40 dark:hover:bg-white/[0.04]'"
          >
            <svg class="w-4 h-4 shrink-0" :class="$route.path === '/admin/users' ? 'text-orange-500 dark:text-[#fcb4d5]' : 'text-slate-400 dark:text-slate-500'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
            <span class="leading-none text-center">Модерация</span>
          </router-link>
        </nav>

        <!-- Right: Theme Switcher + Online Badge + User Controls (1-Row) -->
        <div class="flex items-center space-x-2 shrink-0">
          
          <!-- Modern Theme Toggle Button -->
          <button
            @click="toggleTheme"
            class="p-2 rounded-xl border border-black/[0.07] dark:border-white/[0.08] bg-black/[0.02] hover:bg-black/[0.05] dark:bg-white/[0.04] dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-300 transition-all shrink-0 cursor-pointer shadow-xs active:scale-95"
            :title="isDark ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'"
            aria-label="Переключение темы"
          >
            <!-- Sun Icon (shown in Dark mode to switch to Light) -->
            <svg v-if="isDark" class="w-4 h-4 text-[#fcb4d5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="4"/>
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
            </svg>
            <!-- Moon Icon (shown in Light mode to switch to Dark) -->
            <svg v-else class="w-4 h-4 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
            </svg>
          </button>

          <!-- Online Trigger Button -->
          <button
            @click="toggleOnlineDrawer"
            class="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-black/[0.02] hover:bg-black/[0.05] dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-black/[0.07] dark:border-white/[0.08] transition-all text-xs font-semibold shadow-xs group shrink-0 active:scale-95"
            title="Кто сейчас в сети"
          >
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span class="text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors text-[11px] sm:text-xs">
              <span class="hidden xl:inline">В сети: </span><strong class="text-slate-900 dark:text-white font-mono">{{ onlineCount }}</strong>
            </span>
          </button>

          <!-- User Chip / Profile -->
          <div v-if="isLoggedIn && user" class="flex items-center space-x-2 pl-2 border-l border-black/[0.07] dark:border-white/[0.08] shrink-0">
            <router-link
              :to="`/profile/${user.id}`"
              class="flex items-center space-x-2 p-1 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.05] border border-transparent transition-all group"
            >
              <div class="w-7 h-7 rounded-full overflow-hidden bg-orange-100 dark:bg-[#fcb4d5]/20 border border-black/[0.08] dark:border-white/[0.1] flex items-center justify-center text-xs font-bold shrink-0">
                <img v-if="user.avatar_url" :src="user.avatar_url" :alt="user.name" class="w-full h-full object-cover">
                <span v-else class="text-orange-700 dark:text-[#fcb4d5]">{{ user.name ? user.name.charAt(0) : '?' }}</span>
              </div>
              <div class="text-left hidden sm:block">
                <div class="text-xs font-semibold text-slate-800 dark:text-white leading-tight flex items-center space-x-1 group-hover:text-orange-600 dark:group-hover:text-[#fcb4d5] transition-colors">
                  <span class="truncate max-w-[100px]">{{ user.name ? user.name.split(' ')[0] : '' }}</span>
                  <span v-if="user.access_level >= 5" class="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-pink-100 dark:bg-pink-500/25 text-pink-700 dark:text-[#fcb4d5] border border-pink-300 dark:border-[#fcb4d5]/40 leading-none shadow-xs">👑 Хранитель</span>
                  <svg v-else-if="user.access_level >= 3" class="w-3 h-3 text-amber-500 fill-amber-500 inline shrink-0" viewBox="0 0 24 24">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </div>
                <div class="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-none mt-0.5">
                  {{ user.access_level >= 5 ? 'Хранитель' : user.role }} • {{ user.access_level }} ур.
                </div>
              </div>
            </router-link>

            <button
              @click="logout"
              class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all shrink-0 cursor-pointer active:scale-95"
              title="Выйти из системы"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
          </div>

          <div v-else class="flex items-center space-x-2 shrink-0">
            <router-link to="/login" class="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
              Войти
            </router-link>
            <router-link to="/register" class="btn-neon px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm">
              Регистрация
            </router-link>
          </div>

        </div>

      </div>
    </header>

    <!-- Mobile Bottom Navigation Bar (Apple Liquid Glass Floating Dock) -->
    <nav
      v-if="isLoggedIn"
      class="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/85 dark:bg-[#060608]/90 backdrop-blur-2xl border-t border-black/5 dark:border-white/10 px-3 py-2 shadow-[0_-8px_25px_rgba(0,0,0,0.06)] dark:shadow-[0_-10px_35px_rgba(0,0,0,0.85)] transition-colors"
    >
      <div class="flex items-center justify-around max-w-md mx-auto">
        
        <!-- Content Plan -->
        <router-link
          to="/content-plan"
          class="flex flex-col items-center justify-center min-w-[50px] min-h-[44px] rounded-xl transition-all"
          :class="$route.path === '/content-plan' ? 'text-orange-600 dark:text-rose-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'"
        >
          <svg class="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          <span class="text-[10px] tracking-tight">План</span>
        </router-link>

        <!-- Materials -->
        <router-link
          to="/materials"
          class="flex flex-col items-center justify-center min-w-[50px] min-h-[44px] rounded-xl transition-all"
          :class="$route.path === '/materials' ? 'text-orange-600 dark:text-rose-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'"
        >
          <svg class="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
          </svg>
          <span class="text-[10px] tracking-tight">Файлы</span>
        </router-link>

        <!-- Leadership (Level 3-4) -->
        <router-link
          v-if="isLeader"
          to="/management"
          class="flex flex-col items-center justify-center min-w-[50px] min-h-[44px] rounded-xl transition-all"
          :class="$route.path === '/management' ? 'text-orange-600 dark:text-rose-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'"
        >
          <svg class="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/>
          </svg>
          <span class="text-[10px] tracking-tight">Штаб</span>
        </router-link>

        <!-- Superadmin (Level 4) -->
        <router-link
          v-if="isSuperAdmin"
          to="/admin/users"
          class="flex flex-col items-center justify-center min-w-[50px] min-h-[44px] rounded-xl transition-all"
          :class="$route.path === '/admin/users' ? 'text-orange-600 dark:text-rose-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'"
        >
          <svg class="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
          <span class="text-[10px] tracking-tight">Админ</span>
        </router-link>

        <!-- Profile -->
        <router-link
          v-if="user"
          :to="`/profile/${user.id}`"
          class="flex flex-col items-center justify-center min-w-[50px] min-h-[44px] rounded-xl transition-all"
          :class="$route.path.startsWith('/profile') ? 'text-orange-600 dark:text-rose-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'"
        >
          <svg class="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
          <span class="text-[10px] tracking-tight">Профиль</span>
        </router-link>

        <!-- Mobile Theme Toggle -->
        <button
          @click="toggleTheme"
          class="flex flex-col items-center justify-center min-w-[50px] min-h-[44px] rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-all cursor-pointer"
          :title="isDark ? 'Светлая тема' : 'Тёмная тема'"
        >
          <svg v-if="isDark" class="w-5 h-5 mb-0.5 text-rose-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="4"/>
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
          </svg>
          <svg v-else class="w-5 h-5 mb-0.5 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
          </svg>
          <span class="text-[10px] tracking-tight">{{ isDark ? 'День' : 'Ночь' }}</span>
        </button>

      </div>
    </nav>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useThemeStore } from '../stores/theme';

const route = useRoute();

const {
  user,
  isLoggedIn,
  isLeader,
  isSuperAdmin,
  onlineCount,
  toggleOnlineDrawer,
  logout
} = useAuthStore();

const { isDark, toggleTheme } = useThemeStore();

const navDockRef = ref(null);
const navIndicatorStyle = ref({
  transform: 'translate3d(0, 0, 0)',
  width: '0px',
  height: '0px',
  opacity: 0,
  transition: 'none'
});
let isNavInitial = true;

const updateNavIndicator = (animated = true) => {
  nextTick(() => {
    if (!navDockRef.value) return;
    const activeLink = navDockRef.value.querySelector('.router-link-active') || navDockRef.value.querySelector('.router-link-exact-active');
    if (!activeLink) {
      navIndicatorStyle.value = { ...navIndicatorStyle.value, opacity: 0 };
      return;
    }
    const left = activeLink.offsetLeft;
    const top = activeLink.offsetTop;
    const width = activeLink.offsetWidth;
    const height = activeLink.offsetHeight;

    navIndicatorStyle.value = {
      transform: `translate3d(${left}px, ${top}px, 0)`,
      width: `${width}px`,
      height: `${height}px`,
      opacity: 1,
      transition: (animated && !isNavInitial)
        ? 'transform 0.36s cubic-bezier(0.22, 1, 0.36, 1), width 0.36s cubic-bezier(0.22, 1, 0.36, 1), height 0.36s ease, opacity 0.22s ease'
        : 'none'
    };

    if (isNavInitial) {
      setTimeout(() => { isNavInitial = false; }, 50);
    }
  });
};

watch(() => route.path, () => updateNavIndicator(true));

let resizeObserver = null;
const handleResize = () => updateNavIndicator(false);

onMounted(() => {
  updateNavIndicator(false);
  if (typeof ResizeObserver !== 'undefined' && navDockRef.value) {
    resizeObserver = new ResizeObserver(() => updateNavIndicator(false));
    resizeObserver.observe(navDockRef.value);
  }
  window.addEventListener('resize', handleResize);
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => updateNavIndicator(false));
  }
});

onBeforeUnmount(() => {
  if (resizeObserver) resizeObserver.disconnect();
  window.removeEventListener('resize', handleResize);
});
</script>
