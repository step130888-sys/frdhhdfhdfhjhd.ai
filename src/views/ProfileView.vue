<template>
  <div class="max-w-7xl mx-auto px-4 md:px-6 py-8">
    <div v-if="loading" class="text-center py-24 text-slate-400 text-xs">
      <div class="animate-spin w-8 h-8 border-2 border-orange-500 dark:border-[#fcb4d5] border-t-transparent rounded-full mx-auto mb-3"></div>
      Загрузка профиля...
    </div>

    <div v-else-if="!profileUser" class="text-center py-24 text-slate-400">
      Пользователь не найден
    </div>

    <div v-else class="space-y-8">
      
      <!-- Profile Header Card -->
      <div class="cyber-glass rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-white/10 shadow-2xl relative overflow-hidden bg-white dark:bg-[#0c0c10]">
        <!-- Background Glow -->
        <div class="absolute -top-12 -right-12 w-40 h-40 bg-orange-500/10 dark:bg-[#fcb4d5]/15 rounded-full blur-3xl pointer-events-none"></div>

        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          
          <!-- Avatar & Details -->
          <div class="flex items-center space-x-5">
            <!-- Avatar with online status ring -->
            <div class="relative flex-shrink-0">
              <div class="w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden bg-orange-100 dark:bg-[#fcb4d5]/20 border-2 border-orange-200 dark:border-[#fcb4d5]/30 flex items-center justify-center font-black text-2xl text-orange-700 dark:text-[#fcb4d5] shadow-xl">
                <img v-if="profileUser.avatar_url" :src="profileUser.avatar_url" :alt="profileUser.name" class="w-full h-full object-cover">
                <span v-else>{{ profileUser.name.charAt(0) }}</span>
              </div>
              <span
                v-if="profileUser.is_online"
                class="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-black rounded-full shadow-sm"
                title="Сейчас в сети"
              ></span>
            </div>

            <div>
              <div class="flex flex-wrap items-center gap-2 mb-1">
                <h1 class="text-xl md:text-2xl font-black text-slate-900 dark:text-white">{{ profileUser.name }}</h1>
                <span class="text-xs font-black px-2.5 py-0.5 rounded-full bg-orange-50 dark:bg-[#fcb4d5]/15 text-orange-600 dark:text-[#fcb4d5] border border-orange-200 dark:border-[#fcb4d5]/30">
                  {{ profileUser.role }}
                </span>
                <span
                  class="text-[10px] font-black px-2 py-0.5 rounded-full border uppercase"
                  :class="profileUser.access_level >= 4 ? 'bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/30' : (profileUser.access_level === 3 ? 'bg-orange-500/15 text-orange-600 dark:text-[#fcb4d5] border-orange-500/30 dark:border-[#fcb4d5]/30' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10')"
                >
                  Уровень {{ profileUser.access_level }}
                </span>
              </div>

              <div class="text-xs text-slate-400 font-medium">
                @{{ profileUser.username }} •
                <span v-if="profileUser.is_online" class="text-emerald-500 font-bold">● В сети</span>
                <span v-else>Был(а) в сети: {{ profileUser.last_seen_formatted || 'недавно' }}</span>
              </div>

              <!-- Avatar change trigger (Self or Admin) -->
              <div v-if="canEditAvatar" class="mt-3">
                <label class="cursor-pointer text-[11px] font-bold text-orange-600 dark:text-[#fcb4d5] hover:text-orange-700 dark:hover:text-white bg-orange-50 dark:bg-[#fcb4d5]/10 hover:bg-orange-100 dark:hover:bg-[#fcb4d5]/20 px-3 py-1.5 rounded-xl border border-orange-200 dark:border-[#fcb4d5]/30 transition-all inline-flex items-center space-x-1.5">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                  </svg>
                  <span>Сменить аватар</span>
                  <input type="file" @change="uploadAvatar" class="hidden" accept="image/*" />
                </label>
              </div>
            </div>
          </div>

          <!-- Quick Actions: Force Assign -->
          <div class="flex flex-wrap items-center gap-3">
            <button
              v-if="canForceAssign"
              @click="showAssignModal = true"
              class="btn-neon px-5 py-3 rounded-2xl text-xs font-black shadow-xl flex items-center space-x-2"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              <span>Принудительно выдать задачу</span>
            </button>
          </div>

        </div>

        <!-- KPI Metrics Grid (Atomic SQLite Calculation) -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-200 dark:border-white/10">
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-[#14141c] border border-slate-200 dark:border-white/10 text-center transition-colors">
            <span class="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-1">Выполнено задач</span>
            <span class="text-2xl font-black text-slate-800 dark:text-white">{{ profileUser.completed_tasks }}</span>
          </div>

          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-[#14141c] border border-slate-200 dark:border-white/10 text-center transition-colors">
            <span class="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-1">Средний балл (1..10)</span>
            <span class="text-2xl font-black text-orange-600 dark:text-[#fcb4d5]">{{ profileUser.average_score }} <span class="text-xs text-slate-400 dark:text-slate-500">/ 10.0</span></span>
          </div>

          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-[#14141c] border border-slate-200 dark:border-white/10 text-center transition-colors">
            <span class="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-1">В работе сейчас</span>
            <span class="text-2xl font-black text-amber-600 dark:text-amber-300">{{ inProgressCount }}</span>
          </div>

          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-[#14141c] border border-slate-200 dark:border-white/10 text-center transition-colors">
            <span class="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-1">На проверке</span>
            <span class="text-2xl font-black text-purple-600 dark:text-purple-300">{{ reviewCount }}</span>
          </div>
        </div>

      </div>

      <!-- Telegram & VK Bindings Card -->
      <div v-if="isMe || isSuperAdmin" class="cyber-glass rounded-3xl p-6 border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0c10]">
        <h3 class="text-xs font-black uppercase tracking-wider text-orange-600 dark:text-[#fcb4d5] mb-4 flex items-center space-x-2">
          <svg class="w-4 h-4 text-orange-500 dark:text-[#fcb4d5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="12" x="3" y="8" rx="2"/><path d="M12 2v6"/><circle cx="9" cy="14" r="1"/><circle cx="15" cy="14" r="1"/>
          </svg>
          <span>Привязка ботов Telegram и ВКонтакте</span>
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <!-- Telegram -->
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-[#14141c] border border-slate-200 dark:border-white/10">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Telegram (@username):</label>
            <div class="flex items-center space-x-2">
              <input
                v-model="telegramId"
                type="text"
                placeholder="@username"
                class="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0c10] text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5] font-mono"
              />
              <button
                @click="bindTelegram"
                class="btn-neon px-4 py-2 rounded-xl text-xs font-black flex-shrink-0"
              >
                Сохранить
              </button>
            </div>
          </div>

          <!-- VK -->
          <div class="p-4 rounded-2xl bg-slate-50 dark:bg-[#14141c] border border-slate-200 dark:border-white/10">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">ВКонтакте (ссылка или ID):</label>
            <div class="flex items-center space-x-2">
              <input
                v-model="vkId"
                type="text"
                placeholder="https://vk.com/id... или screen_name"
                class="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0c10] text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5] font-mono"
              />
              <button
                @click="bindVk"
                class="btn-cyan px-4 py-2 rounded-xl text-xs font-black flex-shrink-0"
              >
                Привязать
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Assigned Tasks Section (Requirement 5) -->
      <div>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div class="flex items-center space-x-2.5">
            <div class="w-7 h-7 rounded-lg bg-orange-50 dark:bg-[#fcb4d5]/15 border border-orange-200 dark:border-[#fcb4d5]/30 flex items-center justify-center text-orange-600 dark:text-[#fcb4d5]">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
              </svg>
            </div>
            <h2 class="text-base font-extrabold text-slate-900 dark:text-white">
              Задачи участника ({{ filteredTasks.length }})
            </h2>
          </div>

          <!-- Status Filters -->
          <div class="flex flex-wrap gap-1.5 items-center">
            <button
              v-for="st in [
                { label: 'Все', value: '' },
                { label: 'В работе', value: 'in_progress' },
                { label: 'Доработка', value: 'rework' },
                { label: 'Проверка', value: 'review' },
                { label: 'Готово', value: 'done' }
              ]"
              :key="st.value"
              @click="taskFilter = st.value"
              class="px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all"
              :class="taskFilter === st.value
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 dark:from-[#fcb4d5] dark:to-[#f9a8d4] text-white dark:text-black shadow-xs'
                : 'bg-white dark:bg-[#14141c] text-slate-700 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-orange-500 dark:hover:border-[#fcb4d5] hover:text-slate-900 dark:hover:text-slate-200'"
            >
              {{ st.label }}
            </button>
          </div>
        </div>

        <div v-if="filteredTasks.length === 0" class="cyber-glass rounded-2xl p-8 text-center text-slate-400 text-xs bg-white dark:bg-[#0c0c10] border border-slate-200 dark:border-white/10">
          Задач с выбранным статусом не найдено.
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div
            v-for="task in filteredTasks"
            :key="task.id"
            class="cyber-glass-card rounded-2xl p-5 flex flex-col justify-between group cursor-pointer bg-white dark:bg-[#14141c] border border-slate-200 dark:border-white/10 hover:border-orange-500 dark:hover:border-[#fcb4d5] transition-all"
            @click="$router.push(`/task/${task.id}`)"
          >
            <div>
              <div class="flex items-center justify-between gap-2 mb-3">
                <span class="text-[11px] font-black px-2.5 py-0.5 rounded-xl uppercase tracking-wider bg-orange-50 dark:bg-[#fcb4d5]/15 text-orange-600 dark:text-[#fcb4d5] border border-orange-200 dark:border-[#fcb4d5]/30">
                  {{ task.direction }}
                </span>
                <span
                  class="text-[10px] font-black px-2.5 py-0.5 rounded-xl uppercase tracking-wider border font-mono"
                  :class="task.status === 'done' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30' : (task.status === 'review' ? 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30' : (task.status === 'rework' ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30' : 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30'))"
                >
                  {{ task.status === 'done' ? `Готово (${task.score}/10)` : (task.status === 'review' ? 'Проверка' : (task.status === 'rework' ? 'Доработка' : 'В работе')) }}
                </span>
              </div>

              <h3 class="font-extrabold text-sm text-slate-900 dark:text-white mb-2 line-clamp-2 group-hover:text-orange-600 dark:group-hover:text-[#fcb4d5] transition-colors">
                #{{ task.id }} {{ task.title }}
              </h3>

              <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                {{ task.description }}
              </p>

              <div v-if="task.status === 'rework' && task.rework_notes" class="mb-3 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-700 dark:text-rose-200 text-xs flex items-start space-x-1.5">
                <svg class="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <div><span class="font-bold">Правки:</span> {{ task.rework_notes }}</div>
              </div>
            </div>

            <!-- Footer: Quick Chat button & Deadline -->
            <div class="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs" @click.stop>
              <div v-if="task.deadline" class="text-[11px] font-mono text-amber-500 dark:text-amber-400 flex items-center space-x-1">
                <svg class="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span>{{ task.deadline }}</span>
              </div>
              <div v-else class="text-[11px] text-slate-400">Без дедлайна</div>

              <div class="flex items-center space-x-2">
                <router-link
                  :to="`/task/${task.id}`"
                  class="text-xs font-bold px-2.5 py-1 rounded-lg bg-orange-50 dark:bg-[#fcb4d5]/15 hover:bg-orange-100 dark:hover:bg-[#fcb4d5]/25 text-orange-600 dark:text-[#fcb4d5] border border-orange-200 dark:border-[#fcb4d5]/30 transition-all flex items-center space-x-1"
                >
                  <svg class="w-3.5 h-3.5 text-orange-500 dark:text-[#fcb4d5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  <span>Чат</span>
                  <span v-if="task.comments_count">({{ task.comments_count }})</span>
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Forced Assignment Modal -->
    <ForceAssignModal
      v-if="profileUser"
      :is-open="showAssignModal"
      :target-user="profileUser"
      :open-tasks="openTasks"
      @close="showAssignModal = false"
      @assigned="onTaskForceAssigned"
    />

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import ForceAssignModal from '../components/ForceAssignModal.vue';

const route = useRoute();
const { user, isLeader, isWorkshopHead, isSuperAdmin, showNotification } = useAuthStore();

const profileId = computed(() => parseInt(route.params.id, 10));
const profileUser = ref(null);
const userTasks = ref([]);
const openTasks = ref([]);
const inProgressCount = ref(0);
const reviewCount = ref(0);
const loading = ref(true);
const taskFilter = ref('');

const telegramId = ref('');
const vkId = ref('');
const showAssignModal = ref(false);

const filteredTasks = computed(() => {
  if (!taskFilter.value) return userTasks.value;
  return userTasks.value.filter(t => t.status === taskFilter.value);
});

const isMe = computed(() => user.value && user.value.id === profileId.value);
const canEditAvatar = computed(() => isMe.value || isSuperAdmin.value);
const canForceAssign = computed(() => {
  if (!user.value || !profileUser.value) return false;
  if (isLeader.value) return true;
  if (isWorkshopHead.value && user.value.role === profileUser.value.role) return true;
  if (user.value.can_create_tasks && user.value.role === profileUser.value.role) return true;
  return false;
});

const fetchProfile = async () => {
  if (!profileId.value) return;
  loading.value = true;
  try {
    const res = await fetch(`/api/users/${profileId.value}`);
    if (res.ok) {
      const data = await res.json();
      profileUser.value = data.user;
      userTasks.value = data.tasks || [];
      openTasks.value = data.open_tasks || [];
      inProgressCount.value = data.in_progress_count || 0;
      reviewCount.value = data.review_count || 0;
      telegramId.value = data.user.telegram_id || '';
      vkId.value = data.user.vk_id || '';
    }
  } catch (e) {
    console.error('Failed to load profile:', e);
  } finally {
    loading.value = false;
  }
};

const uploadAvatar = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('avatar_file', file);

  try {
    const res = await fetch(`/api/users/${profileId.value}/avatar`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (res.ok) {
      showNotification('Аватар успешно обновлен!');
      await fetchProfile();
    } else {
      alert(data.error || 'Ошибка загрузки аватара');
    }
  } catch (err) {
    alert('Сетевая ошибка при загрузке аватара');
  }
};

const bindTelegram = async () => {
  try {
    const res = await fetch(`/api/users/${profileId.value}/bind-telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegram_id: telegramId.value })
    });
    const data = await res.json();
    if (res.ok) {
      showNotification('Telegram успешно сохранен!');
    }
  } catch (e) {}
};

const bindVk = async () => {
  try {
    const res = await fetch(`/api/users/${profileId.value}/bind-vk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vk_id: vkId.value })
    });
    const data = await res.json();
    if (res.ok) {
      showNotification('ВКонтакте успешно привязан!');
    } else {
      alert(data.error || 'Ошибка привязки VK');
    }
  } catch (e) {
    alert('Сетевая ошибка');
  }
};

const onTaskForceAssigned = (msg) => {
  showNotification(msg);
  fetchProfile();
};

watch(profileId, () => {
  fetchProfile();
});

onMounted(() => {
  fetchProfile();
});
</script>
