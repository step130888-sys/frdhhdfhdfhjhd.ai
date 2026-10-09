<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
    <div class="cyber-glass rounded-3xl max-w-md w-full p-6 md:p-8 shadow-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101016]">
      <!-- Header -->
      <div class="flex items-center space-x-3 mb-2">
        <div class="w-10 h-10 rounded-xl bg-rose-600/15 border border-rose-500/30 flex items-center justify-center text-rose-500 shadow-md">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="1 4 1 10 7 10"/>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
          </svg>
        </div>
        <h3 class="text-lg font-black text-slate-900 dark:text-white">Вернуть задачу на доработку</h3>
      </div>
      <p class="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
        Задача перейдет в статус <strong class="text-rose-600 dark:text-rose-400 font-bold">«Доработка»</strong>. Исполнителю отправится уведомление в боты с указанными замечаниями.
      </p>

      <form @submit.prevent="submitRework" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
            Обязательные замечания и правки:
          </label>
          <textarea
            v-model="reworkNotes"
            rows="4"
            required
            placeholder="Что конкретно нужно переделать, изменить в цветокоррекции, исправить в тексте..."
            class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#14141c] text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:bg-white dark:focus:bg-[#181822] resize-none transition-all"
          ></textarea>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-white/10">
          <button
            type="button"
            @click="$emit('close')"
            class="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-xl transition-colors"
          >
            Отмена
          </button>
          <button
            type="submit"
            :disabled="!reworkNotes.trim() || loading"
            class="bg-rose-600 hover:bg-rose-500 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-rose-600/30 transition-all disabled:opacity-40 flex items-center space-x-1.5 active:scale-95"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="1 4 1 10 7 10"/>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
            </svg>
            <span>{{ loading ? 'Отправка...' : 'Отправить на доработку' }}</span>
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

const emit = defineEmits(['close', 'reworked']);

const reworkNotes = ref('');
const loading = ref(false);

const submitRework = async () => {
  if (!reworkNotes.value.trim()) return;

  loading.value = true;
  try {
    const res = await fetch(`/api/tasks/${props.taskId}/rework`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rework_notes: reworkNotes.value.trim() })
    });
    const data = await res.json();
    if (res.ok) {
      emit('reworked', data.message);
      reworkNotes.value = '';
      emit('close');
    } else {
      alert(data.error || 'Ошибка при отправке на доработку');
    }
  } catch (e) {
    alert('Сетевая ошибка при возврате на доработку');
  } finally {
    loading.value = false;
  }
};
</script>
