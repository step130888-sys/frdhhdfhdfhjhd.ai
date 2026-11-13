<template>
  <transition name="modal">
    <div
      v-if="isOpen && task"
      class="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4"
      @click.self="$emit('close')"
    >
      <div class="cyber-glass rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-7 shadow-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101016]">
        <!-- Header -->
        <div class="flex items-start justify-between gap-3 mb-2">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400 shadow-md shrink-0">
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
            </div>
            <div>
              <h3 class="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                Перезадать задачу #{{ task.id }}
              </h3>
              <p class="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                {{ task.title }}
              </p>
            </div>
          </div>

          <button
            type="button"
            @click="$emit('close')"
            class="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center text-xs transition-colors cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        <p class="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
          Текущий прогресс и оценка (<span v-if="task.score" class="font-mono font-bold">{{ task.score }}/10</span><span v-else>если есть</span>) будут сброшены, а сама задача вернётся в выбранный статус.
        </p>

        <form @submit.prevent="submitReopen" class="space-y-4">
          <!-- Target Status Toggle -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
              В какой статус вернуть задачу:
            </label>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                @click="form.target_status = 'open'"
                class="p-3 rounded-2xl border text-left transition-all cursor-pointer"
                :class="form.target_status === 'open'
                  ? 'bg-sky-500/15 border-sky-500/50 text-sky-900 dark:text-sky-200 ring-2 ring-sky-500/20'
                  : 'bg-slate-50 dark:bg-[#14141c] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20'"
              >
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-black">Свободна</span>
                  <span class="w-2.5 h-2.5 rounded-full" :class="form.target_status === 'open' ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-600'"></span>
                </div>
                <div class="text-[11px] opacity-80 leading-snug">
                  Снять исполнителя, вернуть в общий список
                </div>
              </button>

              <button
                type="button"
                @click="form.target_status = 'in_progress'"
                class="p-3 rounded-2xl border text-left transition-all cursor-pointer"
                :class="form.target_status === 'in_progress'
                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20'
                  : 'bg-slate-50 dark:bg-[#14141c] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20'"
              >
                <div class="flex items-center justify-between mb-1">
                  <span class="text-xs font-black">В работе</span>
                  <span class="w-2.5 h-2.5 rounded-full" :class="form.target_status === 'in_progress' ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'"></span>
                </div>
                <div class="text-[11px] opacity-80 leading-snug">
                  Назначить / оставить исполнителя
                </div>
              </button>
            </div>
          </div>

          <!-- Assignee Picker (only when target_status === 'in_progress') -->
          <div v-if="form.target_status === 'in_progress'">
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              Исполнитель:
            </label>
            <select
              v-model="form.assigned_to_id"
              required
              class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#14141c] text-slate-900 dark:text-white focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
            >
              <option value="" disabled>-- Выберите исполнителя --</option>
              <option v-for="u in availableUsers" :key="u.id" :value="u.id">
                {{ u.name }} ({{ u.role }}){{ u.id === currentAssigneeId ? ' — текущий' : '' }}
              </option>
            </select>
          </div>

          <!-- Deadline & Calendar Event Date -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Дедлайн:
              </label>
              <input
                v-model="form.deadline"
                type="datetime-local"
                class="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#14141c] text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 transition-all"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                Дата в календаре:
              </label>
              <input
                v-model="form.event_date"
                type="date"
                class="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#14141c] text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 transition-all"
              />
            </div>
          </div>

          <!-- Quick Deadline Shift Buttons -->
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">Быстрый дедлайн:</span>
            <button
              v-for="preset in [
                { label: 'Завтра 21:00', days: 1 },
                { label: '+3 дня', days: 3 },
                { label: '+7 дней', days: 7 }
              ]"
              :key="preset.days"
              type="button"
              @click="applyDeadlinePreset(preset.days)"
              class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-white/5 hover:bg-sky-500/15 hover:text-sky-600 dark:hover:text-sky-300 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
            >
              {{ preset.label }}
            </button>
            <button
              type="button"
              @click="form.deadline = ''"
              class="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-white/5 hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-300 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
            >
              Убрать
            </button>
          </div>

          <!-- Clear submission toggle -->
          <label class="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-50 dark:bg-[#14141c] border border-slate-200 dark:border-white/10 cursor-pointer select-none">
            <input
              v-model="form.clear_submission"
              type="checkbox"
              class="mt-0.5 rounded text-sky-600 focus:ring-sky-500 h-4 w-4 border-slate-300 dark:border-white/20 cursor-pointer"
            />
            <span class="text-xs text-slate-700 dark:text-slate-300 leading-snug">
              <strong class="block font-bold">Очистить сданный результат и правки</strong>
              <span class="text-[11px] text-slate-500 dark:text-slate-400">Удалит ссылку на прошлый файл и замечания доработки</span>
            </span>
          </label>

          <!-- Optional Comment -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              Комментарий в чат задачи (необязательно):
            </label>
            <textarea
              v-model="form.comment"
              rows="2"
              placeholder="Например: Нужно переснять с другого ракурса / перезапуск на новую неделю..."
              class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#14141c] text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 resize-none transition-all"
            ></textarea>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-white/10">
            <button
              type="button"
              @click="$emit('close')"
              class="px-4 py-2.5 min-h-[44px] text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              :disabled="loading || (form.target_status === 'in_progress' && !form.assigned_to_id)"
              class="px-5 py-2.5 min-h-[44px] rounded-xl text-xs font-black text-white bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 shadow-lg shadow-sky-600/25 transition-all disabled:opacity-40 flex items-center space-x-1.5 active:scale-95 cursor-pointer"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
              <span>{{ loading ? 'Перезапуск...' : 'Перезадать задачу' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useAuthStore } from '../stores/auth';

const props = defineProps({
  isOpen: Boolean,
  task: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['close', 'reopened']);

const { isLeader } = useAuthStore();
const usersList = ref([]);
const loading = ref(false);

const form = ref({
  target_status: 'open',
  assigned_to_id: '',
  deadline: '',
  event_date: '',
  clear_submission: true,
  comment: ''
});

const toDatetimeLocal = (raw) => {
  if (!raw) return '';
  const cleaned = String(raw).trim().replace(' ', 'T');
  return cleaned.length >= 16 ? cleaned.slice(0, 16) : cleaned;
};

const toDateInput = (raw) => {
  if (!raw) return '';
  const cleaned = String(raw).trim();
  return cleaned.length >= 10 ? cleaned.slice(0, 10) : cleaned;
};

const userMatchesDir = (u, dir) => {
  if (!u || !dir || dir === 'Общее') return true;
  const dirs = (u.role || '').split(',').map((s) => s.trim().toLowerCase());
  return dirs.includes(dir.trim().toLowerCase());
};

const currentAssigneeId = computed(() => props.task?.assigned_to_id || props.task?.assigned_to?.id || null);

const availableUsers = computed(() => {
  const dir = props.task?.direction || '';
  const list = [...usersList.value];
  const filtered = isLeader.value
    ? list
    : list.filter((u) => userMatchesDir(u, dir) || u.id === currentAssigneeId.value);

  return filtered.sort((a, b) => {
    const aMatch = userMatchesDir(a, dir) ? 0 : 1;
    const bMatch = userMatchesDir(b, dir) ? 0 : 1;
    if (aMatch !== bMatch) return aMatch - bMatch;
    return (a.name || '').localeCompare(b.name || '', 'ru');
  });
});

const loadUsers = async () => {
  try {
    const res = await fetch('/api/users', { credentials: 'include' });
    if (res.ok) {
      usersList.value = await res.json();
    }
  } catch (e) {}
};

watch(
  () => [props.isOpen, props.task],
  ([open, task]) => {
    if (open && task) {
      if (usersList.value.length === 0) {
        loadUsers();
      }
      form.value = {
        target_status: 'open',
        assigned_to_id: task.assigned_to_id || task.assigned_to?.id || '',
        deadline: toDatetimeLocal(task.deadline),
        event_date: toDateInput(task.event_date || task.deadline),
        clear_submission: true,
        comment: ''
      };
    }
  },
  { immediate: true }
);

const applyDeadlinePreset = (daysOffset) => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const datePart = `${yyyy}-${mm}-${dd}`;
  form.value.deadline = `${datePart}T21:00`;
  form.value.event_date = datePart;
};

const submitReopen = async () => {
  if (!props.task || loading.value) return;
  loading.value = true;

  try {
    const payload = {
      target_status: form.value.target_status,
      assigned_to_id: form.value.target_status === 'in_progress' ? form.value.assigned_to_id : null,
      deadline: form.value.deadline ? form.value.deadline.replace('T', ' ') : '',
      event_date: form.value.event_date || '',
      clear_submission: form.value.clear_submission,
      comment: form.value.comment.trim()
    };

    const res = await fetch(`/api/tasks/${props.task.id}/reopen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Не удалось перезадать задачу');
    }

    emit('reopened', data);
    emit('close');
  } catch (err) {
    alert(err.message || 'Ошибка при перезапуске задачи');
  } finally {
    loading.value = false;
  }
};
</script>
