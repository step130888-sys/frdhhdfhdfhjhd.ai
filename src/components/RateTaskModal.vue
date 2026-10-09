<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
    <div class="cyber-glass rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-white/10 transition-colors bg-white dark:bg-[#0c0c10]">
      <!-- Header -->
      <div class="flex items-center space-x-3 mb-2">
        <div class="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-400/30 flex items-center justify-center text-amber-600 dark:text-amber-300 shadow-xs">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </div>
        <h3 class="text-lg font-black text-slate-800 dark:text-white">Принять и оценить задачу</h3>
      </div>
      <p class="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
        Задача будет закрыта со статусом <strong class="text-emerald-600 dark:text-emerald-300">«Выполнено»</strong>. Средний рейтинг исполнителя пересчитается автоматически в СУБД.
      </p>

      <form @submit.prevent="submitRating" class="space-y-5">
        <!-- Score Selection -->
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
            Оценка работы (от 1 до 10 баллов):
          </label>
          <div class="flex items-center space-x-4">
            <input
              v-model.number="score"
              type="number"
              min="1"
              max="10"
              required
              class="w-24 px-3 py-2 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#14141c] text-slate-900 dark:text-white rounded-xl text-lg font-black text-center focus:ring-2 focus:ring-orange-500/20 dark:focus:ring-[#fcb4d5]/20 focus:border-orange-500 dark:focus:border-[#fcb4d5] focus:outline-none"
            />
            <span class="text-xs text-slate-500 dark:text-slate-400 font-bold">из 10.0 возможных баллов</span>
          </div>
        </div>

        <!-- Quick Score Buttons 1 to 10 from left to right -->
        <div>
          <label class="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
            Быстрый выбор балла (слева направо):
          </label>
          <div class="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
            <button
              v-for="s in [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]"
              :key="s"
              type="button"
              @click="score = s"
              class="py-2 rounded-xl text-xs font-black border transition-all text-center flex items-center justify-center cursor-pointer"
              :class="score === s 
                ? (s >= 8 ? 'bg-emerald-500 text-white border-emerald-400 shadow-md scale-105' : (s >= 5 ? 'bg-amber-500 text-black border-amber-400 shadow-md scale-105' : 'bg-red-500 text-white border-red-400 shadow-md scale-105'))
                : 'bg-slate-100 dark:bg-[#14141c] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:border-orange-500 dark:hover:border-[#fcb4d5] hover:text-orange-600 dark:hover:text-[#fcb4d5]'"
            >
              {{ s }}
            </button>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-white/10">
          <button
            type="button"
            @click="$emit('close')"
            class="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-xl"
          >
            Отмена
          </button>
          <button
            type="submit"
            :disabled="loading"
            class="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-md transition-all disabled:opacity-40 flex items-center space-x-1.5 active:scale-95 cursor-pointer"
          >
            <span>{{ loading ? 'Сохранение...' : 'Принять работу' }}</span>
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  isOpen: Boolean,
  taskId: {
    type: Number,
    required: true
  }
});

const emit = defineEmits(['close', 'rated']);

const score = ref(10);
const loading = ref(false);

const submitRating = async () => {
  loading.value = true;
  try {
    const res = await fetch(`/api/tasks/${props.taskId}/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: score.value })
    });
    const data = await res.json();
    if (res.ok) {
      emit('rated', data.message);
      emit('close');
    } else {
      alert(data.error || 'Ошибка оценивания');
    }
  } catch (e) {
    alert('Сетевая ошибка при выставлении оценки');
  } finally {
    loading.value = false;
  }
};
</script>
