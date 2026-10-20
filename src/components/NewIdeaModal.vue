<template>
  <transition name="modal">
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm" @click.self="close">
      <div
        class="cyber-glass bg-white dark:bg-[#0E0F17] rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-7 md:p-8 border border-slate-200 dark:border-white/10 shadow-2xl relative"
      >
      <div class="flex items-center justify-between mb-5">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 rounded-2xl bg-amber-500/15 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-300 shadow-xs">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2v1"/><path d="M12 21v1"/><path d="M4.93 4.93l.7.7"/><path d="M18.36 18.36l.7.7"/><path d="M2 12h1"/><path d="M21 12h1"/><path d="M4.93 19.07l.7-.7"/><path d="M18.36 5.64l.7-.7"/>
              <circle cx="12" cy="12" r="5"/>
            </svg>
          </div>
          <div>
            <h3 class="text-base font-extrabold text-slate-900 dark:text-white">Предложить новую идею</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">Чат будет виден только вам и руководству (3–5 ур.)</p>
          </div>
        </div>

        <button
          @click="close"
          class="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
        >
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <form @submit.prevent="submitIdea" class="space-y-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Суть идеи (кратко):
          </label>
          <input
            v-model="title"
            type="text"
            required
            maxlength="200"
            placeholder="Например: Запустить рубрику интервью с преподавателями в VK Клипах"
            class="w-full text-xs px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#141520] text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5]"
          />
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Подробное описание и реализация:
          </label>
          <textarea
            v-model="description"
            rows="5"
            required
            placeholder="Опишите, для какого направления (цеха) подходит идея, какой формат материалов, целевая аудитория или какие ресурсы потребуются..."
            class="w-full text-xs px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#141520] text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5] resize-none leading-relaxed"
          ></textarea>
        </div>

        <div class="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-200 flex items-start space-x-2">
          <span class="text-amber-500 text-sm">💡</span>
          <span>После создания откроется мини-чат, где руководство (руководители цехов, админы и хранители) сможет ответить вам, дать фидбек и взять идею в контент-план!</span>
        </div>

        <div class="flex items-center justify-end space-x-2 pt-2">
          <button
            type="button"
            @click="close"
            class="px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            Отмена
          </button>
          <button
            type="submit"
            :disabled="submitting || !title.trim() || !description.trim()"
            class="btn-neon px-5 py-2.5 min-h-[44px] rounded-xl text-xs font-bold text-white shadow-md flex items-center space-x-2 disabled:opacity-40 cursor-pointer active:scale-95"
          >
            <span>{{ submitting ? 'Отправка...' : 'Отправить идею на рассмотрение (+1)' }}</span>
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
  isOpen: { type: Boolean, default: false }
});

const emit = defineEmits(['close', 'created']);

const title = ref('');
const description = ref('');
const submitting = ref(false);

const close = () => {
  emit('close');
};

const submitIdea = async () => {
  if (!title.value.trim() || !description.value.trim() || submitting.value) return;

  submitting.value = true;
  try {
    const res = await fetch('/api/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.value.trim(),
        description: description.value.trim()
      })
    });
    const data = await res.json();
    if (res.ok) {
      title.value = '';
      description.value = '';
      emit('created', data.idea);
      close();
    } else {
      alert(data.error || 'Ошибка при сохранении идеи');
    }
  } catch (e) {
    alert('Сетевая ошибка при отправке идеи');
  } finally {
    submitting.value = false;
  }
};
</script>
