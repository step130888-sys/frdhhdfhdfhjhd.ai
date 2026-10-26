<template>
  <div class="relative min-h-[90vh] flex flex-col items-center justify-center px-4 py-8 overflow-hidden select-none">
    
    <!-- Top Terminal Meta Bar (Midjourney HUD Style) -->
    <div class="relative z-10 w-full max-w-md mb-4 flex items-center justify-between text-[11px] font-mono text-slate-600 dark:text-slate-400 px-3.5 py-2 rounded-xl bg-white/90 dark:bg-black/60 backdrop-blur-xl border border-slate-300/80 dark:border-white/10 shadow-[0_4px_16px_-2px_rgba(15,23,42,0.08)]">
      <div class="flex items-center space-x-2">
        <span class="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span class="font-bold tracking-wider text-slate-900 dark:text-slate-200">KEDR_CORE // SYS.ONLINE</span>
      </div>
      <div class="flex items-center space-x-3 text-[10px]">
        <span class="hidden sm:inline opacity-70">AUTH_SHA256</span>
        <span class="text-orange-600 dark:text-[#fcb4d5] font-bold">[ 5 ЦЕХОВ ]</span>
      </div>
    </div>

    <!-- Central Authentication Capsule (Midjourney Translucent Brutalist Glass) -->
    <div class="relative z-10 max-w-md w-full group">
      <!-- Ambient Backlight for Light Mode Separation & Depth -->
      <div class="absolute -inset-1.5 sm:-inset-2 rounded-[36px] bg-gradient-to-b from-orange-400/25 via-slate-300/35 to-orange-500/15 dark:from-[#fcb4d5]/10 dark:via-purple-500/5 dark:to-transparent blur-xl -z-10 pointer-events-none transition-all duration-300"></div>

      <div class="w-full rounded-3xl p-6 sm:p-8 bg-white/95 dark:bg-[#07070B]/90 backdrop-blur-3xl border border-slate-300/90 dark:border-white/10 shadow-[0_22px_55px_-10px_rgba(15,23,42,0.18),0_0_0_1px_rgba(15,23,42,0.06),0_8px_20px_-6px_rgba(15,23,42,0.08)] dark:shadow-2xl transition-all duration-300">
        
        <!-- Terminal Header -->
        <div class="text-center mb-6">
          <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-orange-500/10 dark:bg-[#fcb4d5]/10 text-orange-600 dark:text-[#fcb4d5] border border-orange-500/20 dark:border-[#fcb4d5]/20 text-[10px] font-mono font-bold tracking-wider mb-2.5">
            <span class="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
            <span>СМС СГТУ // AUTH</span>
          </div>

          <h1 class="text-xl sm:text-2xl font-black tracking-tight text-slate-950 dark:text-white uppercase font-mono">
            Вход в терминал
          </h1>
          <p class="text-xs text-slate-600 dark:text-slate-400 mt-1 font-mono font-medium">
            Единая координационная платформа медиацентра
          </p>
        </div>

        <!-- Error Alert with Sci-Fi Terminal Style -->
        <transition name="fade">
          <div
            v-if="errorMsg"
            class="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-mono flex items-start space-x-2.5 shadow-sm"
          >
            <svg class="w-4 h-4 text-rose-500 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div class="leading-relaxed">
              <span class="font-bold">[ОШИБКА АВТОРИЗАЦИИ]</span>
              <div>{{ errorMsg }}</div>
            </div>
          </div>
        </transition>

        <!-- Terminal Authentication Form -->
        <form @submit.prevent="handleLogin" class="space-y-4">
          
          <!-- Username Field -->
          <div>
            <label class="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1.5 flex items-center justify-between">
              <span>&gt; ИМЯ_ПОЛЬЗОВАТЕЛЯ:</span>
              <span class="text-[10px] text-slate-500 font-medium">логин</span>
            </label>
            <div class="relative">
              <input
                v-model="username"
                type="text"
                required
                autocomplete="username"
                placeholder="admin"
                class="w-full text-xs font-mono font-semibold px-4 py-3 rounded-2xl border border-slate-300/90 dark:border-white/10 bg-slate-50/90 dark:bg-[#101017]/90 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:bg-white dark:focus:bg-[#14141e] focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5] focus:ring-4 focus:ring-orange-500/15 dark:focus:ring-[#fcb4d5]/20 transition-all shadow-xs"
              />
              <span class="absolute right-3.5 top-3 text-[11px] font-mono text-slate-400 dark:text-slate-600 pointer-events-none">_</span>
            </div>
          </div>

          <!-- Password Field with Show/Hide Toggle -->
          <div>
            <label class="block text-[11px] font-mono font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1.5 flex items-center justify-between">
              <span>&gt; ПАРОЛЬ_ДОСТУПА:</span>
              <button
                type="button"
                @click="showPassword = !showPassword"
                class="text-[10px] font-mono font-bold text-orange-600 dark:text-[#fcb4d5] hover:underline focus:outline-none cursor-pointer"
              >
                [{{ showPassword ? 'СКРЫТЬ' : 'ПОКАЗАТЬ' }}]
              </button>
            </label>
            <div class="relative">
              <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                autocomplete="current-password"
                placeholder="••••••••"
                class="w-full text-xs font-mono font-semibold px-4 py-3 rounded-2xl border border-slate-300/90 dark:border-white/10 bg-slate-50/90 dark:bg-[#101017]/90 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:bg-white dark:focus:bg-[#14141e] focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5] focus:ring-4 focus:ring-orange-500/15 dark:focus:ring-[#fcb4d5]/20 transition-all shadow-xs"
              />
            </div>
          </div>

          <!-- Remember Me Checkbox -->
          <div class="flex items-center justify-between pt-0.5 pb-0.5">
            <label class="inline-flex items-center space-x-2.5 cursor-pointer select-none group">
              <input
                v-model="rememberMe"
                type="checkbox"
                class="sr-only peer"
              />
              <div class="w-4 h-4 rounded-md border border-slate-300 dark:border-white/20 bg-slate-100 dark:bg-[#14141e] peer-checked:bg-orange-600 dark:peer-checked:bg-white peer-checked:border-orange-600 dark:peer-checked:border-white flex items-center justify-center transition-all shadow-xs group-hover:border-orange-500/70 dark:group-hover:border-white/40">
                <svg
                  v-show="rememberMe"
                  class="w-3 h-3 text-white dark:text-slate-950 stroke-[3]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span class="text-[11px] font-mono text-slate-700 dark:text-slate-300 group-hover:text-slate-950 dark:group-hover:text-white transition-colors">
                Запомнить меня
              </span>
            </label>

            <span class="text-[10px] font-mono text-slate-400 dark:text-slate-500">
              [ СЕССИЯ 90 ДНЕЙ ]
            </span>
          </div>

          <!-- High-Contrast Action Button (Brand Orange in Light Mode, Stark Midjourney White in Dark Mode) -->
          <button
            type="submit"
            :disabled="loading"
            class="w-full group mt-3 py-3.5 px-5 rounded-2xl text-xs font-mono font-black tracking-wider uppercase bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-500/25 dark:bg-white dark:hover:bg-[#fcb4d5] dark:text-slate-950 dark:shadow-none border border-transparent transition-all duration-200 flex items-center justify-center space-x-2.5 active:scale-[0.985] disabled:opacity-50 cursor-pointer"
          >
            <span v-if="!loading" class="group-hover:translate-x-0.5 transition-transform">[ ВОЙТИ В СИСТЕМУ → ]</span>
            <span v-else class="flex items-center space-x-2">
              <span class="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
              <span>АВТОРИЗАЦИЯ...</span>
            </span>
          </button>

        </form>

        <!-- Bottom Secondary Navigation -->
        <div class="mt-6 pt-5 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-slate-600 dark:text-slate-400 gap-2">
          <div>
            <span>Новый участник?</span>
            <router-link
              to="/register"
              class="text-orange-600 dark:text-[#fcb4d5] hover:underline font-bold ml-1.5 inline-flex items-center space-x-1"
            >
              <span>[ Подать заявку ]</span>
            </router-link>
          </div>

          <div class="text-[10px] text-slate-400 dark:text-slate-500">
            СГТУ им. Гагарина Ю.А.
          </div>
        </div>

      </div>
    </div>

    <!-- Bottom ASCII Footer Ticker in clean glass pill -->
    <div class="relative z-10 mt-6 px-4 py-1.5 rounded-full bg-white/85 dark:bg-black/40 backdrop-blur-md border border-slate-300/80 dark:border-white/10 shadow-xs text-[10px] font-mono text-slate-600 dark:text-slate-400 tracking-wider text-center max-w-md w-full flex items-center justify-center space-x-4">
      <span class="hover:text-orange-600 dark:hover:text-[#fcb4d5] transition-colors cursor-default">● ФОТО</span>
      <span class="hover:text-orange-600 dark:hover:text-[#fcb4d5] transition-colors cursor-default">● ДИЗАЙН</span>
      <span class="hover:text-orange-600 dark:hover:text-[#fcb4d5] transition-colors cursor-default">● ВИДЕО</span>
      <span class="hover:text-orange-600 dark:hover:text-[#fcb4d5] transition-colors cursor-default">● МОУШЕН</span>
      <span class="hover:text-orange-600 dark:hover:text-[#fcb4d5] transition-colors cursor-default">● СММ</span>
      <span class="hover:text-orange-600 dark:hover:text-[#fcb4d5] transition-colors cursor-default">● ЗВУК</span>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const { login } = useAuthStore();

const username = ref('');
const password = ref('');
const showPassword = ref(false);
const rememberMe = ref(true);
const loading = ref(false);
const errorMsg = ref('');

onMounted(() => {
  const savedUser = localStorage.getItem('sms_saved_username');
  const savedRemember = localStorage.getItem('sms_remember_me');
  if (savedUser) {
    username.value = savedUser;
  }
  if (savedRemember !== null) {
    rememberMe.value = savedRemember === 'true';
  }
});

const handleLogin = async () => {
  errorMsg.value = '';
  loading.value = true;
  try {
    if (rememberMe.value) {
      localStorage.setItem('sms_saved_username', username.value.trim());
      localStorage.setItem('sms_remember_me', 'true');
    } else {
      localStorage.removeItem('sms_saved_username');
      localStorage.setItem('sms_remember_me', 'false');
    }
    await login(username.value, password.value, rememberMe.value);
    router.push('/content-plan');
  } catch (err) {
    errorMsg.value = err.message || 'Неверный логин или пароль';
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
