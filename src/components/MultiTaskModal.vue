<template>
  <transition name="modal">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md"
      @click.self="$emit('close')"
    >
      <div class="cyber-glass max-w-2xl w-full max-h-[92vh] flex flex-col rounded-3xl border border-white/60 dark:border-white/10 shadow-2xl overflow-hidden backdrop-blur-3xl">
      
      <!-- Modal Header -->
      <div class="px-6 py-4 bg-white/40 dark:bg-white/[0.04] backdrop-blur-xl border-b border-black/[0.05] dark:border-white/[0.08] flex items-center justify-between flex-shrink-0">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 rounded-xl bg-orange-500/10 dark:bg-[#fcb4d5]/15 border border-orange-500/20 dark:border-[#fcb4d5]/30 flex items-center justify-center text-orange-600 dark:text-[#fcb4d5]">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
            </svg>
          </div>
          <div>
            <h3 class="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
              {{ isEditing ? 'Редактировать мульти-задачу' : 'Создать мульти-задачу' }}
            </h3>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">
              Координация от 1 до 5 подразделений под одно общее мероприятие контент-плана
            </p>
          </div>
        </div>
        <button
          @click="$emit('close')"
          class="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center text-sm transition-colors"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Modal Body -->
      <form @submit.prevent="submitMultiTask" class="p-6 overflow-y-auto flex-1 space-y-4">
        <div v-if="errorMsg" class="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-600 dark:text-red-300 text-xs font-semibold">
          {{ errorMsg }}
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
            Название общего события / проекта:
          </label>
          <input
            v-model="form.title"
            type="text"
            required
            placeholder="Например: Студенческая весна СГТУ 2026"
            class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#14141c] text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5] focus:bg-white"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">Дата события:</label>
            <input
              v-model="form.event_date"
              type="date"
              required
              class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#14141c] text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5] focus:bg-white"
            />
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">Дедлайн сдачи:</label>
            <input
              v-model="form.deadline"
              type="text"
              placeholder="ГГГГ-ММ-ДД ЧЧ:ММ"
              class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#14141c] text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5] focus:bg-white"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">Общее описание и вводные:</label>
          <textarea
            v-model="form.description"
            rows="2"
            placeholder="Локация, сценарий, контакты организаторов..."
            class="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#14141c] text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5] focus:bg-white resize-none"
          ></textarea>
        </div>

        <!-- Department Selection (1 to 5 workshops) -->
        <div class="pt-2">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-extrabold uppercase tracking-wider text-orange-600 dark:text-[#fcb4d5]">
              Подразделения в задаче (выберите от 1 до 5):
            </span>
            <span class="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              Выбрано: {{ form.departments.length }} / 5
            </span>
          </div>

          <!-- Checkboxes Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
            <label
              v-for="w in allWorkshops"
              :key="w.name"
              class="flex items-center space-x-2 p-2.5 rounded-xl border cursor-pointer select-none transition-all text-xs font-bold"
              :class="form.departments.includes(w.name)
                ? 'bg-orange-500/10 dark:bg-[#fcb4d5]/15 border-orange-500 dark:border-[#fcb4d5] text-orange-600 dark:text-[#fcb4d5] shadow-sm'
                : 'bg-slate-50 dark:bg-[#14141c] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-orange-300 dark:hover:border-[#fcb4d5]/40'"
            >
              <input
                type="checkbox"
                :value="w.name"
                v-model="form.departments"
                class="rounded border-slate-300 dark:border-white/20 text-orange-500 dark:text-[#fcb4d5] focus:ring-0"
              />
              <span>{{ w.name }}</span>
            </label>
          </div>

          <!-- Custom briefs for checked departments -->
          <div v-if="form.departments.length === 0" class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-300 text-xs flex items-center space-x-2">
            <svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>Выберите хотя бы одно подразделение (например, только Фото или Дизайн + Видео).</span>
          </div>

          <div v-else class="space-y-2.5 mt-3">
            <div
              v-for="dir in form.departments"
              :key="dir"
              class="p-3 rounded-xl bg-slate-50 dark:bg-[#14141c] border border-slate-200 dark:border-white/10"
            >
              <label class="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1.5">
                <span>Техническое задание для цеха «{{ dir }}»:</span>
              </label>
              <input
                v-model="form.subtasks[dir]"
                type="text"
                :placeholder="getWorkshopPlaceholder(dir)"
                class="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0c10] text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5]"
              />
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-end space-x-3">
          <button
            type="button"
            @click="$emit('close')"
            class="px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            Отмена
          </button>
          <button
            type="submit"
            :disabled="loading || form.departments.length === 0"
            class="btn-neon px-5 py-2.5 min-h-[44px] rounded-xl text-xs font-black shadow-xl flex items-center space-x-2 disabled:opacity-50 cursor-pointer active:scale-95"
          >
            <span>{{ loading ? 'Сохранение...' : (isEditing ? 'Сохранить проект' : 'Создать мульти-проект (+1)') }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</transition>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue';

const props = defineProps({
  isOpen: Boolean,
  editEvent: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['close', 'saved']);

const loading = ref(false);
const errorMsg = ref('');

const allWorkshops = [
  { name: 'Фото', placeholder: 'Репортажная съемка, отбор и базовая цветокоррекция фото' },
  { name: 'Дизайн', placeholder: 'Афиша, обложки постов, инфографика' },
  { name: 'Видео', placeholder: 'Динамичный ролик Reels / Shorts на 30-45 секунд' },
  { name: 'Моушен', placeholder: 'Анимированная заставка и плашки' },
  { name: 'СММ', placeholder: 'Анонс и итоговый пост с ключевыми цитатами' },
  { name: 'Звук', placeholder: 'Запись звука на площадке, подкаст, сведение и мастеринг' }
];

const getWorkshopPlaceholder = (name) => {
  const w = allWorkshops.find(item => item.name === name);
  return w ? w.placeholder : 'ТЗ для отдела';
};

const today = new Date().toISOString().substring(0, 10);

const form = reactive({
  title: '',
  description: '',
  event_date: today,
  deadline: `${today} 21:00`,
  departments: ['Фото', 'Дизайн', 'Видео', 'Моушен', 'СММ', 'Звук'],
  subtasks: {
    'Фото': '',
    'Дизайн': '',
    'Видео': '',
    'Моушен': '',
    'СММ': '',
    'Звук': ''
  }
});

const isEditing = computed(() => Boolean(props.editEvent && props.editEvent.id));

watch(() => props.isOpen, (open) => {
  if (open) {
    errorMsg.value = '';
    if (props.editEvent) {
      // Populate for editing
      form.title = props.editEvent.title || '';
      form.description = props.editEvent.description || '';
      form.event_date = props.editEvent.event_date || today;
      form.deadline = props.editEvent.deadline || `${today} 21:00`;
      
      const subtasks = props.editEvent.subtasks || [];
      if (subtasks.length > 0) {
        form.departments = subtasks.map(s => s.direction);
        for (const st of subtasks) {
          form.subtasks[st.direction] = st.description || '';
        }
      } else {
        form.departments = ['Фото', 'Дизайн'];
      }
    } else {
      // Reset for creation
      form.title = '';
      form.description = '';
      form.event_date = today;
      form.deadline = `${today} 21:00`;
      form.departments = ['Фото', 'Дизайн', 'Видео', 'Моушен', 'СММ', 'Звук'];
      for (const w of allWorkshops) {
        form.subtasks[w.name] = '';
      }
    }
  }
});

watch(() => form.event_date, (val) => {
  if (val && !form.deadline.includes(val)) {
    form.deadline = `${val} 21:00`;
  }
});

const submitMultiTask = async () => {
  if (form.departments.length === 0) {
    errorMsg.value = 'Выберите хотя бы одно подразделение.';
    return;
  }

  loading.value = true;
  errorMsg.value = '';

  try {
    const url = isEditing.value ? `/api/tasks/multi/${props.editEvent.id}/update` : '/api/tasks/multi';
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Ошибка при сохранении мульти-задачи');
    }

    emit('saved', data);
    emit('close');
  } catch (err) {
    errorMsg.value = err.message;
  } finally {
    loading.value = false;
  }
};
</script>
