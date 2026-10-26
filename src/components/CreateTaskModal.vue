<template>
  <transition name="modal">
    <div v-if="isOpen" class="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4">
      <div class="cyber-glass rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-7 md:p-8 shadow-2xl border border-white/60 dark:border-white/10 backdrop-blur-3xl">
      <!-- Header -->
      <div class="flex items-center space-x-3 mb-2">
        <div class="w-9 h-9 rounded-xl bg-orange-500/10 dark:bg-kedrRose/15 border border-orange-500/20 dark:border-kedrRose/30 flex items-center justify-center text-orange-600 dark:text-kedrRose">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
          </svg>
        </div>
        <h3 class="text-lg font-black text-slate-900 dark:text-white">Создать новую задачу</h3>
      </div>
      <p class="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
        Задача появится в контент-плане и ботах Telegram / VK для участников выбранного цеха.
      </p>

      <form @submit.prevent="submitTask" class="space-y-4">
        <!-- Title -->
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
            Название задачи:
          </label>
          <input
            v-model="form.title"
            type="text"
            required
            placeholder="Например: Съемка Дня первокурсника в актовом зале"
            class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#14141c] text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-kedrRose focus:ring-2 focus:ring-orange-500/20 dark:focus:ring-kedrRose/20 focus:bg-white dark:focus:bg-[#181822] transition-all"
          />
        </div>

        <!-- Direction & Deadline Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <!-- Direction -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              Направление (цех):
            </label>
            <select
              v-model="form.direction"
              :disabled="userLevel <= 2 && selectableDirections.length <= 1"
              required
              class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#14141c] text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-kedrRose focus:ring-2 focus:ring-orange-500/20 dark:focus:ring-kedrRose/20 focus:bg-white dark:focus:bg-[#181822] disabled:opacity-75 transition-all"
            >
              <option v-for="d in selectableDirections" :key="d" :value="d">{{ d }}</option>
            </select>
          </div>

          <!-- Deadline -->
          <div>
            <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              Дедлайн сдачи:
            </label>
            <input
              v-model="form.deadline"
              type="datetime-local"
              class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#14141c] text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-kedrRose focus:ring-2 focus:ring-orange-500/20 dark:focus:ring-kedrRose/20 focus:bg-white dark:focus:bg-[#181822] transition-all"
            />
          </div>
        </div>

        <!-- Optional Assignee -->
        <div v-if="userLevel >= 2">
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
            Назначить исполнителя сразу (необязательно):
          </label>
          <select
            v-model="form.assigned_to_id"
            class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#14141c] text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-kedrRose focus:ring-2 focus:ring-orange-500/20 dark:focus:ring-kedrRose/20 focus:bg-white dark:focus:bg-[#181822] transition-all"
          >
            <option :value="null">-- Оставить свободной (в общий план) --</option>
            <option v-for="u in usersList" :key="u.id" :value="u.id">
              {{ u.name }} ({{ u.role }})
            </option>
          </select>
        </div>

        <!-- Description -->
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
            Подробное ТЗ / Описание:
          </label>
          <textarea
            v-model="form.description"
            rows="4"
            required
            placeholder="Что именно нужно сделать, формат файлов, тайминги, референсы..."
            class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#14141c] text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-kedrRose focus:ring-2 focus:ring-orange-500/20 dark:focus:ring-kedrRose/20 focus:bg-white dark:focus:bg-[#181822] resize-none transition-all"
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
            :disabled="loading"
            class="btn-neon px-5 py-2.5 min-h-[44px] rounded-xl text-xs font-black text-white dark:text-[#121217] shadow-lg disabled:opacity-40 flex items-center space-x-1.5 cursor-pointer active:scale-95"
          >
            <span>{{ loading ? 'Создание...' : 'Опубликовать задачу (+1)' }}</span>
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </form>
    </div>
  </div>
</transition>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';

const props = defineProps({
  isOpen: Boolean,
  currentUser: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['close', 'created']);

const userLevel = ref(props.currentUser?.access_level || 1);
const loading = ref(false);
const usersList = ref([]);

const selectableDirections = computed(() => {
  if (userLevel.value >= 3) {
    return ['Фото', 'Дизайн', 'Видео', 'Моушен', 'СММ', 'Звук'];
  }
  const myDirs = (props.currentUser?.role || '').split(',').map(s => s.trim()).filter(Boolean);
  return myDirs.length ? myDirs : ['Фото'];
});

const form = ref({
  title: '',
  description: '',
  direction: (props.currentUser?.role || '').split(',')[0]?.trim() || 'Фото',
  deadline: '',
  assigned_to_id: null
});

watch(() => props.currentUser, (newVal) => {
  if (newVal) {
    userLevel.value = newVal.access_level;
    const myDirs = (newVal.role || '').split(',').map(s => s.trim()).filter(Boolean);
    if (!form.value.direction || (newVal.access_level <= 2 && !myDirs.includes(form.value.direction))) {
      form.value.direction = myDirs[0] || 'Фото';
    }
  }
}, { immediate: true });

onMounted(async () => {
  try {
    const res = await fetch('/api/users');
    if (res.ok) {
      usersList.value = await res.json();
    }
  } catch (e) {}
});

const submitTask = async () => {
  loading.value = true;
  try {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
    });
    const data = await res.json();
    if (res.ok) {
      emit('created', data.task);
      form.value.title = '';
      form.value.description = '';
      form.value.deadline = '';
      form.value.assigned_to_id = null;
      emit('close');
    } else {
      alert(data.error || 'Ошибка создания задачи');
    }
  } catch (e) {
    alert('Сетевая ошибка при создании задачи');
  } finally {
    loading.value = false;
  }
};
</script>
