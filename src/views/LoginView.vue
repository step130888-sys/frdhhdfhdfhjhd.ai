<template>
  <div class="min-h-[85vh] flex items-center justify-center px-4 py-12">
    <div class="cyber-glass max-w-md w-full p-8 md:p-10 rounded-3xl border border-white/60 dark:border-white/10 shadow-sm relative overflow-hidden">
      <!-- Brand Header -->
      <div class="text-center mb-8 relative z-10">
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Вход в систему</h1>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">Закрытая координационная платформа медиацентра</p>
      </div>

      <!-- Error Alert -->
      <div v-if="errorMsg" class="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center space-x-2">
        <svg class="w-4 h-4 text-red-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>{{ errorMsg }}</span>
      </div>

      <!-- Login Form -->
      <form @submit.prevent="handleLogin" class="space-y-4 relative z-10">
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Логин:</label>
          <input
            v-model="username"
            type="text"
            required
            autocomplete="username"
            placeholder="stepyn"
            class="w-full text-xs px-4 py-3 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-slate-50 dark:bg-[#14151D] text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5] focus:ring-2 focus:ring-orange-500/20 dark:focus:ring-[#fcb4d5]/20 transition-all"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Пароль:</label>
          <input
            v-model="password"
            type="password"
            required
            autocomplete="current-password"
            placeholder="••••••••"
            class="w-full text-xs px-4 py-3 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-slate-50 dark:bg-[#14151D] text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5] focus:ring-2 focus:ring-orange-500/20 dark:focus:ring-[#fcb4d5]/20 transition-all"
          />
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full btn-neon py-3 rounded-xl text-xs font-bold text-white dark:text-[#0F0F14] shadow-md flex items-center justify-center space-x-2 disabled:opacity-40 mt-2 cursor-pointer active:scale-95"
        >
          <span>{{ loading ? 'Авторизация...' : 'Войти в систему' }}</span>
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </button>
      </form>

      <!-- Bottom link -->
      <div class="mt-6 pt-5 border-t border-black/10 dark:border-white/10 text-center text-xs text-slate-500 dark:text-slate-400">
        Нет аккаунта?
        <router-link to="/register" class="text-orange-600 dark:text-rose-300 hover:text-orange-700 dark:hover:text-rose-200 font-bold ml-1">
          Подать заявку на вступление
        </router-link>
      </div>

      <!-- Quick Demo Login Tabs -->
      <div class="mt-8 pt-6 border-t border-black/10 dark:border-white/10">
        <div class="flex items-center justify-between mb-3">
          <span class="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
            <span class="w-2 h-2 rounded-full bg-orange-500 dark:bg-rose-400 animate-ping"></span>
            <span>Быстрый вход для проверки ролей:</span>
          </span>
          <span class="text-[10px] text-orange-600 dark:text-rose-300 font-mono">1 клик</span>
        </div>
        
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            v-for="acc in demoAccounts"
            :key="acc.username"
            type="button"
            @click="quickLogin(acc.username, acc.password)"
            class="group text-left p-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-slate-50 dark:bg-black/60 hover:bg-orange-50/60 dark:hover:bg-white/5 hover:border-orange-400 dark:hover:border-rose-400/50 transition-all text-xs flex flex-col justify-between shadow-2xs"
          >
            <div class="flex items-center justify-between w-full mb-1">
              <span class="font-bold text-slate-800 dark:text-white group-hover:text-orange-600 dark:group-hover:text-rose-300 transition-colors flex items-center space-x-1.5">
                <!-- SVG Icon for role -->
                <svg v-if="acc.roleType === 'superadmin'" class="w-3.5 h-3.5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <svg v-else-if="acc.roleType === 'leader'" class="w-3.5 h-3.5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                <svg v-else-if="acc.roleType === 'head'" class="w-3.5 h-3.5 text-purple-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
                <svg v-else-if="acc.roleType === 'photographer'" class="w-3.5 h-3.5 text-sky-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                <svg v-else class="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span>{{ acc.label }}</span>
              </span>
              <span :class="acc.badgeClass" class="text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold">
                {{ acc.levelTag }}
              </span>
            </div>
            <div class="text-[10px] text-slate-400 font-mono flex items-center justify-between">
              <span>@{{ acc.username }}</span>
              <span class="text-slate-500 group-hover:text-orange-600 dark:group-hover:text-rose-300 transition-colors">Войти →</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const { login } = useAuthStore();

const username = ref('');
const password = ref('');
const loading = ref(false);
const errorMsg = ref('');

const demoAccounts = [
  {
    roleType: 'superadmin',
    label: 'Суперадмин',
    username: 'stepyn',
    password: 'admin',
    levelTag: 'LVL 4',
    badgeClass: 'bg-red-500/20 text-red-300 border border-red-500/30'
  },
  {
    roleType: 'leader',
    label: 'Руководство',
    username: 'leader',
    password: 'admin',
    levelTag: 'LVL 3',
    badgeClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
  },
  {
    roleType: 'head',
    label: 'Глава цеха (Дизайн)',
    username: 'head_design',
    password: 'admin',
    levelTag: 'LVL 2',
    badgeClass: 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
  },
  {
    roleType: 'photographer',
    label: 'Участник (Фото)',
    username: 'photographer',
    password: 'admin',
    levelTag: 'LVL 1',
    badgeClass: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
  },
  {
    roleType: 'pending',
    label: 'Новая заявка',
    username: 'newbie',
    password: 'admin',
    levelTag: 'Ожидает',
    badgeClass: 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
  }
];

const handleLogin = async () => {
  errorMsg.value = '';
  loading.value = true;
  try {
    await login(username.value, password.value);
    router.push('/content-plan');
  } catch (err) {
    errorMsg.value = err.message || 'Ошибка входа';
  } finally {
    loading.value = false;
  }
};

const quickLogin = async (u, p) => {
  username.value = u;
  password.value = p;
  await handleLogin();
};
</script>
