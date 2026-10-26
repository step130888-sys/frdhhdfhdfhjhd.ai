<template>
  <div class="min-h-[85vh] flex items-center justify-center px-4 py-12">
    <div class="cyber-glass max-w-lg w-full p-8 md:p-10 rounded-3xl border border-white/60 dark:border-white/10 shadow-sm relative overflow-hidden">
      <!-- Header -->
      <div class="text-center mb-7 relative z-10">
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Заявка в команду</h1>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
          Регистрация в студенческий медиацентр «СМС СГТУ»
        </p>
      </div>

      <!-- Success Notification -->
      <div v-if="successMsg" class="mb-5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold leading-relaxed">
        {{ successMsg }}
        <div class="mt-3">
          <router-link to="/login" class="text-white bg-emerald-600 px-3 py-1.5 rounded-lg font-bold">
            Вернуться на страницу входа
          </router-link>
        </div>
      </div>

      <!-- Error Alert -->
      <div v-if="errorMsg" class="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center space-x-2">
        <svg class="w-4 h-4 text-red-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>{{ errorMsg }}</span>
      </div>

      <form v-if="!successMsg" @submit.prevent="handleRegister" class="space-y-4 relative z-10">
        <div>
          <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">ФИО полностью:</label>
          <input
            v-model="form.name"
            type="text"
            required
            placeholder="Иванов Иван Иванович"
            class="w-full text-xs px-4 py-3 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-slate-50 dark:bg-[#14151D] text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5] focus:ring-2 focus:ring-orange-500/20 dark:focus:ring-[#fcb4d5]/20 transition-all"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label class="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Желаемый логин:</label>
            <input
              v-model="form.username"
              type="text"
              required
              placeholder="ivanov"
              class="w-full text-xs px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-black text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-rose-400 font-mono"
            />
          </div>

          <div>
            <label class="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Пароль:</label>
            <input
              v-model="form.password"
              type="password"
              required
              placeholder="••••••••"
              class="w-full text-xs px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-black text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-rose-400 font-mono"
            />
          </div>
        </div>

        <!-- Telegram Field -->
        <div>
          <label class="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">Telegram (@username):</label>
          <input
            v-model="form.telegram_id"
            type="text"
            placeholder="@ivanov"
            class="w-full text-xs px-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-black text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-rose-400 font-mono"
          />
        </div>

        <!-- Multiple Directions Selector -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Направления (цехи):
            </label>
            <span class="text-[10px] text-orange-600 dark:text-[#fcb4d5] font-semibold">
              Выберите одно или несколько
            </span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              v-for="dir in availableDirections"
              :key="dir.name"
              type="button"
              @click="toggleRole(dir.name)"
              class="relative p-3 rounded-xl border text-left transition-all flex flex-col justify-between group active:scale-95 cursor-pointer"
              :class="form.roles.includes(dir.name)
                ? 'bg-orange-500/10 dark:bg-[#fcb4d5]/15 border-orange-500 dark:border-[#fcb4d5] ring-1 ring-orange-500/30 dark:ring-[#fcb4d5]/40 text-slate-900 dark:text-white shadow-xs'
                : 'bg-black/[0.02] dark:bg-white/[0.03] border-black/10 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-white/30'"
            >
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-lg">{{ dir.icon }}</span>
                <span
                  class="w-4 h-4 rounded-md border flex items-center justify-center transition-all"
                  :class="form.roles.includes(dir.name)
                    ? 'bg-orange-500 dark:bg-[#fcb4d5] border-orange-500 dark:border-[#fcb4d5] text-white dark:text-black'
                    : 'border-slate-300 dark:border-white/20 bg-white/50 dark:bg-black/50'"
                >
                  <svg v-if="form.roles.includes(dir.name)" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </span>
              </div>
              <div>
                <div class="font-bold text-xs">{{ dir.name }}</div>
                <div class="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-1">{{ dir.desc }}</div>
              </div>
            </button>
          </div>

          <div v-if="form.roles.length > 0" class="mt-2 text-[11px] text-slate-600 dark:text-slate-400 flex items-center space-x-1">
            <span>Выбрано:</span>
            <span class="font-bold text-orange-600 dark:text-[#fcb4d5]">{{ form.roles.join(', ') }}</span>
          </div>
          <div v-else class="mt-2 text-[11px] text-amber-500 font-medium">
            ⚠️ Обязательно выберите хотя бы одно направление
          </div>
        </div>

        <div class="p-3.5 rounded-xl bg-orange-50 dark:bg-rose-500/10 border border-orange-200 dark:border-rose-500/20 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed flex items-start space-x-2.5">
          <svg class="w-4 h-4 text-orange-500 dark:text-rose-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <span>После подачи заявки аккаунт отправляется на модерацию Главному администратору (4 уровень). Вы получите доступ сразу после подтверждения.</span>
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full btn-neon py-3.5 min-h-[44px] rounded-xl text-xs font-black text-white shadow-xl flex items-center justify-center space-x-2 disabled:opacity-40 active:scale-95 transition-all cursor-pointer"
        >
          <span>{{ loading ? 'Отправка...' : 'Отправить заявку на модерацию' }}</span>
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </button>
      </form>

      <div class="mt-6 pt-5 border-t border-black/10 dark:border-white/10 text-center text-xs text-slate-500 dark:text-slate-400">
        Уже есть аккаунт?
        <router-link to="/login" class="text-orange-600 dark:text-[#fcb4d5] hover:text-orange-700 dark:hover:text-white font-bold ml-1">
          Войти
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth';

const { register } = useAuthStore();

const availableDirections = [
  { name: 'Фото', icon: '📸', desc: 'Репортажи, студийная съемка' },
  { name: 'Дизайн', icon: '🎨', desc: 'Афиши, графика, айдентика' },
  { name: 'Видео', icon: '🎬', desc: 'Операторы, клипы, монтаж' },
  { name: 'Моушен', icon: '✨', desc: '2D/3D анимация, заставки' },
  { name: 'СММ', icon: '✍️', desc: 'Тексты, сценарии, посты' },
  { name: 'Звук', icon: '🎙️', desc: 'Звукозапись, сведение, подкасты' }
];

const form = ref({
  name: '',
  username: '',
  password: '',
  roles: ['Фото'],
  role: 'Фото',
  telegram_id: ''
});

const toggleRole = (dirName) => {
  const idx = form.value.roles.indexOf(dirName);
  if (idx > -1) {
    form.value.roles.splice(idx, 1);
  } else {
    form.value.roles.push(dirName);
  }
  form.value.role = form.value.roles.join(', ');
};

const loading = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

const handleRegister = async () => {
  errorMsg.value = '';
  successMsg.value = '';

  if (form.value.roles.length === 0) {
    errorMsg.value = 'Пожалуйста, выберите как минимум одно направление (цех).';
    return;
  }
  form.value.role = form.value.roles.join(', ');

  loading.value = true;
  try {
    const res = await register(form.value);
    successMsg.value = res.message;
  } catch (err) {
    errorMsg.value = err.message || 'Ошибка регистрации';
  } finally {
    loading.value = false;
  }
};
</script>
