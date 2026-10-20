<template>
  <transition name="modal">
    <div v-if="isOpen" class="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4">
      <div class="cyber-glass rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-7 md:p-8 shadow-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101016]">
      <!-- Header -->
      <div class="flex items-center space-x-3 mb-2">
        <div class="w-9 h-9 rounded-xl bg-orange-500/10 dark:bg-kedrRose/15 border border-orange-500/20 dark:border-kedrRose/30 flex items-center justify-center text-orange-600 dark:text-kedrRose shadow-sm">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        </div>
        <h3 class="text-lg font-black text-slate-900 dark:text-white">Назначить задачу участнику</h3>
      </div>
      <p class="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
        Сотрудник: <strong class="text-slate-900 dark:text-white">{{ targetUser.name }}</strong> (Цех: <strong class="text-orange-600 dark:text-kedrRose">{{ targetUser.role }}</strong>).
        Задача перейдет в статус «В работе», исполнитель получит мгновенное уведомление в ботах.
      </p>

      <form @submit.prevent="submitAssignment" class="space-y-4">
        <!-- Task Selection -->
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
            Выберите свободную задачу:
          </label>
          <select
            v-model="selectedTaskId"
            required
            class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#14141c] text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-kedrRose focus:ring-2 focus:ring-orange-500/20 dark:focus:ring-kedrRose/20 focus:bg-white dark:focus:bg-[#181822] transition-all"
          >
            <option value="" disabled>-- Выберите задачу --</option>
            <option v-for="t in openTasks" :key="t.id" :value="t.id">
              #{{ t.id }} [{{ t.direction }}] {{ t.title }} {{ t.deadline ? '• Дедлайн: ' + t.deadline : '' }}
            </option>
          </select>
          <p v-if="openTasks.length === 0" class="text-xs text-amber-500 dark:text-amber-400 mt-1">
            Нет доступных свободных задач в контент-плане для данного цеха.
          </p>
        </div>

        <!-- Instruction / Notes -->
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
            Указание или комментарий руководителя:
          </label>
          <textarea
            v-model="comment"
            rows="3"
            placeholder="Особые пожелания, ссылки на исходники, акценты..."
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
            :disabled="!selectedTaskId || loading"
            class="btn-neon px-5 py-2.5 min-h-[44px] rounded-xl text-xs font-black text-white dark:text-[#121217] shadow-lg disabled:opacity-40 flex items-center space-x-1.5 active:scale-95 cursor-pointer"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            <span>{{ loading ? 'Назначение...' : 'Назначить задачу участнику (+1)' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</transition>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  isOpen: Boolean,
  targetUser: {
    type: Object,
    required: true
  },
  openTasks: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['close', 'assigned']);

const selectedTaskId = ref('');
const comment = ref('');
const loading = ref(false);

const submitAssignment = async () => {
  if (!selectedTaskId.value) return;
  loading.value = true;

  try {
    const res = await fetch(`/api/users/${props.targetUser.id}/assign-task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task_id: selectedTaskId.value,
        comment: comment.value
      })
    });
    const data = await res.json();
    if (res.ok) {
      emit('assigned', data.message);
      emit('close');
    } else {
      alert(data.error || 'Ошибка назначения задачи');
    }
  } catch (e) {
    alert('Сетевая ошибка при назначении задачи');
  } finally {
    loading.value = false;
  }
};
</script>
