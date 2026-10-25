<template>
  <div class="max-w-7xl mx-auto px-4 md:px-6 py-8">
    <div v-if="loading" class="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-pulse">
      <div class="lg:col-span-2 space-y-6">
        <div class="cyber-glass rounded-3xl p-6 md:p-8 border border-slate-200/80 dark:border-white/10 space-y-4">
          <div class="h-6 bg-slate-200 dark:bg-white/10 rounded-xl w-1/4"></div>
          <div class="h-8 bg-slate-200 dark:bg-white/10 rounded-xl w-3/4"></div>
          <div class="h-24 bg-slate-100 dark:bg-white/5 rounded-2xl"></div>
          <div class="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-white/10">
            <div class="h-12 bg-slate-100 dark:bg-white/5 rounded-xl"></div>
            <div class="h-12 bg-slate-100 dark:bg-white/5 rounded-xl"></div>
          </div>
        </div>
      </div>
      <div class="lg:col-span-1">
        <div class="cyber-glass rounded-3xl h-[560px] border border-slate-200/80 dark:border-white/10 p-6">
          <div class="h-6 bg-slate-200 dark:bg-white/10 rounded-xl w-1/2 mb-6"></div>
          <div class="space-y-3">
            <div class="h-16 bg-slate-100 dark:bg-white/5 rounded-2xl w-3/4"></div>
            <div class="h-16 bg-slate-100 dark:bg-white/5 rounded-2xl w-2/3 ml-auto"></div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="!task" class="text-center py-24 text-slate-400">
      Задача не найдена
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      <!-- Left 2 Cols: Task Details & Management -->
      <div class="lg:col-span-2 space-y-6">
        
        <!-- Main Card (Pure Liquid Glass) -->
        <div class="cyber-glass rounded-3xl p-6 md:p-8 border border-slate-200/80 dark:border-white/10 shadow-xs relative overflow-hidden">
          
          <!-- Top Badges -->
          <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div class="flex items-center space-x-2">
              <span class="text-xs font-black px-3 py-1 rounded-xl uppercase tracking-wider bg-orange-500/10 dark:bg-[#fcb4d5]/15 text-orange-600 dark:text-[#fcb4d5] border border-orange-500/20 dark:border-[#fcb4d5]/30 shadow-xs">
                {{ task.direction }}
              </span>
              <span class="text-xs font-mono font-bold text-slate-400">#{{ task.id }}</span>
            </div>

            <!-- Status Badge -->
            <span
              class="text-xs font-black px-3.5 py-1.5 rounded-xl uppercase tracking-wider border shadow-sm flex items-center space-x-1.5 font-mono"
              :class="getStatusClasses(task.status)"
            >
              <span v-if="task.status === 'open'" class="flex items-center space-x-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                <span>Свободна</span>
              </span>
              <span v-else-if="task.status === 'in_progress'" class="flex items-center space-x-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]"></span>
                <span>В работе</span>
              </span>
              <span v-else-if="task.status === 'review'" class="flex items-center space-x-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping"></span>
                <span>На проверке</span>
              </span>
              <span v-else-if="task.status === 'done'" class="flex items-center space-x-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]"></span>
                <span>Выполнена ({{ task.score }}/10)</span>
              </span>
              <span v-else-if="task.status === 'rework'" class="flex items-center space-x-1.5">
                <span class="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-[0_0_6px_#f43f5e]"></span>
                <span>Доработка</span>
              </span>
            </span>
          </div>

          <!-- Title -->
          <h1 class="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight mb-4">
            {{ task.title }}
          </h1>

          <!-- Rework Warning Box -->
          <div v-if="task.status === 'rework' && task.rework_notes" class="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/40 text-rose-800 dark:text-rose-200 text-xs leading-relaxed">
            <div class="font-black text-rose-700 dark:text-rose-300 text-xs uppercase tracking-wide mb-1 flex items-center space-x-2">
              <svg class="w-4 h-4 text-rose-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span>Замечания и правки от руководства:</span>
            </div>
            {{ task.rework_notes }}
          </div>

          <!-- Description -->
          <div class="mb-6">
            <h4 class="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Техническое задание:</h4>
            <div class="text-xs md:text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line bg-slate-50/80 dark:bg-[#14141c] p-4 rounded-2xl border border-slate-200 dark:border-white/10">
              {{ task.description }}
            </div>
          </div>

          <!-- Submitted File / Link Box -->
          <div v-if="task.file_link" class="mb-6 p-4 rounded-2xl bg-orange-500/10 dark:bg-[#fcb4d5]/10 border border-orange-500/20 dark:border-[#fcb4d5]/25">
            <h4 class="text-xs font-black text-orange-600 dark:text-[#fcb4d5] uppercase tracking-wider mb-2 flex items-center space-x-2">
              <svg class="w-3.5 h-3.5 text-orange-500 dark:text-[#fcb4d5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
              </svg>
              <span>Сданный результат / материалы:</span>
            </h4>
            <a
              :href="task.file_link"
              target="_blank"
              class="inline-flex items-center space-x-1.5 text-orange-600 dark:text-[#fcb4d5] hover:underline font-bold text-xs break-all bg-white dark:bg-[#1a1a24] px-3 py-1.5 rounded-xl border border-orange-500/20 dark:border-[#fcb4d5]/30"
            >
              <span>{{ task.file_name || task.file_link }}</span>
              <span>↗</span>
            </a>
          </div>

          <!-- Assignee & Deadline Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-slate-200 dark:border-white/10 text-xs">
            <div>
              <span class="text-slate-500 dark:text-slate-400 block mb-1">Исполнитель:</span>
              <div v-if="task.assigned_to" class="flex items-center space-x-2">
                <div class="w-7 h-7 rounded-full overflow-hidden bg-orange-500/20 dark:bg-[#fcb4d5]/20 text-orange-600 dark:text-[#fcb4d5] border border-orange-500/30 dark:border-[#fcb4d5]/30 flex items-center justify-center font-bold text-[11px]">
                  <img v-if="task.assigned_to.avatar_url" :src="task.assigned_to.avatar_url" class="w-full h-full object-cover">
                  <span v-else>{{ task.assigned_to.name.charAt(0) }}</span>
                </div>
                <router-link :to="`/profile/${task.assigned_to.id}`" class="font-bold text-slate-800 dark:text-white hover:text-orange-600 dark:hover:text-[#fcb4d5] transition-colors">
                  {{ task.assigned_to.name }} ({{ task.assigned_to.role }})
                </router-link>
              </div>
              <span v-else class="text-slate-400 dark:text-slate-500 italic">Не назначен (свободна)</span>
            </div>

            <div>
              <span class="text-slate-500 dark:text-slate-400 block mb-1">Дедлайн:</span>
              <div v-if="task.deadline" class="font-bold flex items-center space-x-1.5" :class="task.is_expired ? 'text-rose-500 dark:text-rose-400 animate-pulse' : (task.is_urgent ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-200')">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <span>{{ formatDeadline(task.deadline) }}</span>
                <span v-if="task.is_expired" class="text-[10px] ml-1 bg-red-500/20 px-1.5 py-0.5 rounded border border-red-500/30">Просрочен</span>
              </div>
              <span v-else class="text-slate-400 dark:text-slate-500 italic">Не установлен</span>
            </div>
          </div>

        </div>

        <!-- Task Action Controls Card -->
        <div class="cyber-glass rounded-3xl p-6 border border-slate-200/80 dark:border-white/10 space-y-4">
          <div class="text-xs font-black uppercase tracking-wider text-orange-600 dark:text-[#fcb4d5] flex items-center space-x-2">
            <svg class="w-4 h-4 text-orange-500 dark:text-[#fcb4d5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            <span>Управление жизненным циклом задачи</span>
          </div>

          <div class="flex flex-wrap gap-3">
            <!-- 1. Take Task (if open) -->
            <button
              v-if="task.status === 'open'"
              @click="takeTask"
              class="btn-neon px-5 py-2.5 min-h-[44px] rounded-xl text-xs font-black text-white shadow-lg flex items-center space-x-2 active:scale-95 cursor-pointer"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              <span>Взять задачу в работу (+1)</span>
            </button>

            <!-- 2. Submit Work (if assignee and in_progress/rework) -->
            <button
              v-if="canSubmitWork"
              @click="showSubmitModal = true"
              class="btn-cyan px-5 py-2.5 min-h-[44px] rounded-xl text-xs font-black text-white shadow-lg flex items-center space-x-2 active:scale-95 cursor-pointer"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <span>Сдать работу на проверку</span>
            </button>

            <!-- 3. Leadership: Accept & Rate (Level 3-4) -->
            <button
              v-if="isLeader && task.status !== 'done'"
              @click="showRateModal = true"
              class="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shadow-xs active:scale-95 cursor-pointer"
            >
              <svg class="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <span>Принять и оценить (1..10)</span>
            </button>

            <!-- 4. Leadership & Workshop Head: Send to Rework (Level 2-4) -->
            <button
              v-if="canRework"
              @click="showReworkModal = true"
              class="bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 px-5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shadow-xs active:scale-95 cursor-pointer"
            >
              <svg class="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>
              </svg>
              <span>Вернуть задачу на доработку</span>
            </button>

            <!-- 5. Delete Task (Level 3-5 or Level 2 head of department) -->
            <button
              v-if="canDeleteTask"
              @click="deleteTask"
              class="bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30 px-5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shadow-xs active:scale-95 cursor-pointer ml-auto"
              title="Удалить задачу навсегда"
            >
              <svg class="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
              </svg>
              <span>Удалить задачу безвозвратно</span>
            </button>
          </div>
        </div>

      </div>

      <!-- Right 1 Col: Live Discussion Chat -->
      <div class="lg:col-span-1">
        <TaskChat :task-id="taskId" />
      </div>

    </div>

    <!-- Modals -->
    <SubmitWorkModal
      :is-open="showSubmitModal"
      :task-id="taskId"
      @close="showSubmitModal = false"
      @submitted="onWorkSubmitted"
    />

    <RateTaskModal
      :is-open="showRateModal"
      :task-id="taskId"
      @close="showRateModal = false"
      @rated="onTaskRated"
    />

    <ReworkTaskModal
      :is-open="showReworkModal"
      :task-id="taskId"
      @close="showReworkModal = false"
      @reworked="onTaskReworked"
    />

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import TaskChat from '../components/TaskChat.vue';
import SubmitWorkModal from '../components/SubmitWorkModal.vue';
import RateTaskModal from '../components/RateTaskModal.vue';
import ReworkTaskModal from '../components/ReworkTaskModal.vue';

const route = useRoute();
const router = useRouter();
const { user, isLeader, isWorkshopHead, showNotification } = useAuthStore();

const taskId = computed(() => parseInt(route.params.id, 10));
const task = ref(null);
const loading = ref(true);

watch(taskId, (newVal) => {
  if (newVal) fetchTask();
});

const showSubmitModal = ref(false);
const showRateModal = ref(false);
const showReworkModal = ref(false);

const canSubmitWork = computed(() => {
  if (!task.value || !user.value) return false;
  const isAssignee = task.value.assigned_to_id === user.value.id;
  const isAdmin = user.value.access_level >= 4;
  const validStatus = ['in_progress', 'rework', 'open'].includes(task.value.status);
  return (isAssignee || isAdmin) && validStatus;
});

const canRework = computed(() => {
  if (!task.value || !user.value) return false;
  if (task.value.status === 'open' || task.value.status === 'rework') return false;
  return isLeader.value;
});

const userHasDirection = (u, dir) => {
  if (!u || !dir) return false;
  const dirs = (u.role || '').split(',').map(s => s.trim().toLowerCase());
  return dirs.includes(dir.trim().toLowerCase());
};

const canDeleteTask = computed(() => {
  if (!task.value || !user.value) return false;
  if (user.value.access_level >= 3) return true;
  if (user.value.can_create_tasks && userHasDirection(user.value, task.value.direction)) return true;
  return false;
});

const deleteTask = async () => {
  if (!task.value) return;
  const isSubtask = Boolean(task.value.parent_id);
  const confirmMsg = isSubtask
    ? `Вы уверены, что хотите удалить подзадачу #${taskId.value} «${task.value.title}»?`
    : `Вы действительно хотите удалить задачу #${taskId.value} «${task.value.title}»? Это действие нельзя отменить.`;

  if (!confirm(confirmMsg)) return;

  try {
    const res = await fetch(`/api/tasks/${taskId.value}`, { credentials: 'include', method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ошибка удаления задачи');
    showNotification(data.message || 'Задача успешно удалена', 'success');
    router.push('/content-plan');
  } catch (err) {
    showNotification(err.message, 'error');
  }
};

const fetchTask = async () => {
  if (!taskId.value) return;
  loading.value = true;
  try {
    const res = await fetch(`/api/tasks/${taskId.value}`);
    if (res.ok) {
      const data = await res.json();
      task.value = data.task;
    }
  } catch (e) {
    console.error('Failed to load task:', e);
  } finally {
    loading.value = false;
  }
};

const takeTask = async () => {
  if (!taskId.value) return;
  try {
    const res = await fetch(`/api/tasks/${taskId.value}/take`, { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      showNotification(data.message);
      await fetchTask();
    } else {
      alert(data.error || 'Ошибка');
    }
  } catch (e) {
    alert('Сетевая ошибка');
  }
};

const onWorkSubmitted = (msg) => {
  showNotification(msg);
  fetchTask();
};

const onTaskRated = (msg) => {
  showNotification(msg);
  fetchTask();
};

const onTaskReworked = (msg) => {
  showNotification(msg, 'warning');
  fetchTask();
};

const getStatusClasses = (status) => {
  switch (status) {
    case 'open':
      return 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10';
    case 'in_progress':
      return 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30';
    case 'review':
      return 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30 animate-pulse';
    case 'done':
      return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30';
    case 'rework':
      return 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30';
    default:
      return 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10';
  }
};

const formatDeadline = (dl) => {
  if (!dl) return '';
  try {
    const d = new Date(dl);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}.${mm} ${hh}:${min}`;
  } catch (e) {
    return dl;
  }
};

onMounted(() => {
  fetchTask();
});
</script>
