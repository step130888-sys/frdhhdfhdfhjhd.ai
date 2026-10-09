<template>
  <div
    v-if="isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md"
    @click.self="$emit('close')"
  >
    <div class="cyber-glass max-w-2xl w-full max-h-[92vh] flex flex-col rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden bg-white dark:bg-[#0c0c10] animate-in fade-in zoom-in-95 duration-200">
      
      <!-- Modal Header -->
      <div class="px-6 py-4 bg-slate-50 dark:bg-[#101016] border-b border-slate-200 dark:border-white/10 flex items-center justify-between flex-shrink-0">
        <div class="flex items-center space-x-3">
          <div class="w-8 h-8 rounded-xl bg-orange-500/10 dark:bg-[#fcb4d5]/15 border border-orange-500/20 dark:border-[#fcb4d5]/30 flex items-center justify-center text-orange-600 dark:text-[#fcb4d5]">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div>
            <h3 class="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">Создать событие дня в календаре</h3>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">Генерирует макро-задачу на выбранный день и 5 отдельных подзадач под каждый цех</p>
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
      <form @submit.prevent="submitEvent" class="p-6 overflow-y-auto flex-1 space-y-4">
        <div v-if="errorMsg" class="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-600 dark:text-red-300 text-xs font-semibold">
          {{ errorMsg }}
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">Название события / инфоповода:</label>
          <input
            v-model="form.title"
            type="text"
            required
            placeholder="Например: День открытых дверей СГТУ"
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
            <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">Дедлайн сдачи материалов:</label>
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
            placeholder="Локация, время, таймлайн и ключевые спикеры..."
            class="w-full text-xs px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#14141c] text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5] focus:bg-white resize-none"
          ></textarea>
        </div>

        <!-- 5 Subtasks configuration -->
        <div class="pt-2">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-extrabold uppercase tracking-wider text-orange-600 dark:text-[#fcb4d5]">Подзадачи по цехам (5 направлений):</span>
            <button
              type="button"
              @click="toggleSubtasksCustom = !toggleSubtasksCustom"
              class="text-[11px] text-orange-500 dark:text-[#fcb4d5] hover:underline font-bold"
            >
              {{ toggleSubtasksCustom ? 'Скрыть индивидуальные ТЗ' : 'Настроить ТЗ для каждого цеха' }}
            </button>
          </div>

          <div v-if="!toggleSubtasksCustom" class="p-3 rounded-xl bg-slate-50 dark:bg-[#14141c] border border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
            <span>Будут автоматически сгенерированы 5 подзадач для «Фото», «Дизайн», «Видео», «Моушен», «СММ».</span>
            <span class="text-orange-600 dark:text-[#fcb4d5] font-bold ml-2 inline-flex items-center gap-1">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              <span>Авто-ТЗ</span>
            </span>
          </div>

          <div v-else class="space-y-2.5">
            <div v-for="w in workshops" :key="w.name" class="p-2.5 rounded-xl bg-slate-50 dark:bg-[#14141c] border border-slate-200 dark:border-white/10">
              <label class="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">ТЗ для цеха «{{ w.name }}»:</label>
              <input
                v-model="form.subtasks[w.name]"
                type="text"
                :placeholder="w.placeholder"
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
            class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
          >
            Отмена
          </button>
          <button
            type="submit"
            :disabled="loading"
            class="btn-neon px-5 py-2.5 rounded-xl text-xs font-black shadow-xl flex items-center space-x-2 disabled:opacity-50"
          >
            <span>{{ loading ? 'Создание...' : 'Создать событие и 5 задач' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue';

const props = defineProps({
  isOpen: Boolean
});

const emit = defineEmits(['close', 'created']);

const loading = ref(false);
const errorMsg = ref('');
const toggleSubtasksCustom = ref(false);

const workshops = [
  { name: 'Фото', placeholder: 'Репортажная съемка, отбор и базовая цветокоррекция 50 лучших фото' },
  { name: 'Дизайн', placeholder: 'Обложка для статьи, афиша мероприятия, инфографика' },
  { name: 'Видео', placeholder: 'Динамичный вертикальный ролик Reels / Shorts на 30-45 секунд' },
  { name: 'Моушен', placeholder: 'Анимированная плашка с таймлайном и логотипом мероприятия' },
  { name: 'СММ', placeholder: 'Анонсирующий и итоговый посты с цитатами и хэштегами' }
];

const today = new Date().toISOString().substring(0, 10);

const form = reactive({
  title: '',
  event_date: today,
  deadline: '',
  description: '',
  subtasks: {
    'Фото': 'Репортажная фотосъемка, качественный отбор и цветокоррекция',
    'Дизайн': 'Оформление афиши, плашки и обложки публикации',
    'Видео': 'Динамичная съемка и вертикальный монтаж (Reels/Shorts)',
    'Моушен': 'Анимация графических элементов и интро/аутро',
    'СММ': 'Написание текста поста, подбор хэштегов и публикация'
  }
});

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    errorMsg.value = '';
    form.title = '';
    form.event_date = today;
    form.deadline = '';
    form.description = '';
  }
});

const submitEvent = async () => {
  if (!form.title || !form.event_date) {
    errorMsg.value = 'Заполните название и дату мероприятия';
    return;
  }

  loading.value = true;
  errorMsg.value = '';

  try {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });

    const data = await res.json();
    if (res.ok) {
      emit('created', data.event);
      emit('close');
    } else {
      errorMsg.value = data.error || 'Ошибка при создании события';
    }
  } catch (err) {
    errorMsg.value = 'Сетевая ошибка при создании события дня';
  } finally {
    loading.value = false;
  }
};
</script>
