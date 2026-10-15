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
            placeholder="admin"
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
</script>
