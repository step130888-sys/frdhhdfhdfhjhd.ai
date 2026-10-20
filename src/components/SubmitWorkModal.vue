<template>
  <transition name="modal">
    <div v-if="isOpen" class="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4">
      <div class="cyber-glass rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto p-5 sm:p-7 md:p-8 shadow-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#101016]">
      <!-- Header -->
      <div class="flex items-center space-x-3 mb-2">
        <div class="w-10 h-10 rounded-xl bg-orange-500/10 dark:bg-kedrRose/15 border border-orange-500/20 dark:border-kedrRose/30 flex items-center justify-center text-orange-600 dark:text-kedrRose shadow-md">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <h3 class="text-lg font-black text-slate-900 dark:text-white">Сдать выполненную работу</h3>
      </div>
      <p class="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
        Задача перейдет в статус <strong class="text-orange-600 dark:text-kedrRose font-bold">«На проверке»</strong>. Руководителям отправится пуш-уведомление с интерактивными кнопками оценки.
      </p>

      <form @submit.prevent="submitWork" class="space-y-4">
        <!-- File upload -->
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
            Файл с устройства (до 100 МБ):
          </label>
          <input
            type="file"
            ref="fileInput"
            class="block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-orange-500 dark:file:bg-kedrRose file:text-white dark:file:text-[#121217] hover:file:opacity-90 cursor-pointer border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50 dark:bg-[#14141c] p-1 transition-all"
          />
        </div>

        <div class="text-center text-[10px] text-slate-500 font-bold uppercase">— ИЛИ —</div>

        <!-- External link -->
        <div>
          <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
            Ссылка на Google Диск / Облако / Пост:
          </label>
          <input
            v-model="fileLink"
            type="url"
            placeholder="https://drive.google.com/... или https://vk.com/..."
            class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#14141c] text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-kedrRose focus:ring-2 focus:ring-orange-500/20 dark:focus:ring-kedrRose/20 focus:bg-white dark:focus:bg-[#181822] transition-all"
          />
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
            class="btn-neon px-5 py-2.5 min-h-[44px] rounded-xl text-xs font-black text-white dark:text-[#121217] shadow-lg disabled:opacity-40 flex items-center space-x-1.5 active:scale-95 cursor-pointer"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            <span>{{ loading ? 'Отправка...' : 'Отправить работу на проверку' }}</span>
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
  taskId: {
    type: Number,
    required: true
  }
});

const emit = defineEmits(['close', 'submitted']);

const fileInput = ref(null);
const fileLink = ref('');
const loading = ref(false);

const submitWork = async () => {
  const file = fileInput.value?.files[0];
  if (!file && !fileLink.value.trim()) {
    alert('Прикрепите файл или укажите внешнюю ссылку на результат.');
    return;
  }

  loading.value = true;
  try {
    const formData = new FormData();
    if (file) {
      formData.append('file_upload', file);
    }
    if (fileLink.value.trim()) {
      formData.append('file_link', fileLink.value.trim());
    }

    const res = await fetch(`/api/tasks/${props.taskId}/submit`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (res.ok) {
      emit('submitted', data.message);
      fileLink.value = '';
      emit('close');
    } else {
      alert(data.error || 'Ошибка при сдаче работы');
    }
  } catch (e) {
    alert('Сетевая ошибка при отправке работы');
  } finally {
    loading.value = false;
  }
};
</script>
