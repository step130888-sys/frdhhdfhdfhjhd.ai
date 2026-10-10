<template>
  <div class="cyber-glass rounded-3xl flex flex-col h-[560px] border border-slate-200/80 dark:border-white/10 overflow-hidden shadow-xl transition-colors">
    
    <!-- Chat Header -->
    <div class="px-5 py-3.5 border-b border-black/[0.05] dark:border-white/[0.08] bg-white/40 dark:bg-white/[0.04] backdrop-blur-xl flex items-center justify-between flex-shrink-0 transition-colors">
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 rounded-xl bg-orange-50 dark:bg-[#fcb4d5]/15 border border-orange-200 dark:border-[#fcb4d5]/30 flex items-center justify-center text-orange-600 dark:text-[#fcb4d5] shadow-xs">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <div>
          <h4 class="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white flex items-center space-x-1.5">
            <span>Обсуждение задачи</span>
            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#34d399]"></span>
          </h4>
          <p class="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Чат с куратором и командой</p>
        </div>
      </div>

      <div class="flex items-center space-x-2">
        <button
          @click="fetchComments"
          title="Обновить сообщения"
          class="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 rounded-lg bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 transition-colors"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
            <path d="M21 3v5h-5"/>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
            <path d="M8 16H3v5"/>
          </svg>
        </button>
        <div class="text-[10px] font-bold text-orange-700 dark:text-[#fcb4d5] bg-orange-50 dark:bg-[#fcb4d5]/15 px-2.5 py-1 rounded-full border border-orange-200 dark:border-[#fcb4d5]/30 font-mono">
          {{ comments.length }} сообщ.
        </div>
      </div>
    </div>

    <!-- Message List (Scrollable Area) -->
    <div ref="chatContainer" class="flex-1 overflow-y-auto p-4 md:p-5 space-y-4 bg-slate-50/50 dark:bg-[#08080c] transition-colors">
      
      <!-- Empty Placeholder -->
      <div v-if="comments.length === 0" class="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
        <div class="w-14 h-14 rounded-2xl bg-orange-50 dark:bg-[#fcb4d5]/10 border border-orange-200 dark:border-[#fcb4d5]/20 flex items-center justify-center text-orange-500 dark:text-[#fcb4d5] mb-3 shadow-xs">
          <svg class="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <div class="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">В этой задаче пока нет сообщений</div>
        <div class="text-slate-500 dark:text-slate-400 text-xs mt-1.5 max-w-xs leading-relaxed">
          Задайте вопрос куратору, согласуйте референсы или отправьте ссылку на черновик
        </div>
      </div>

      <!-- Messages Stream -->
      <div
        v-for="(c, idx) in comments"
        :key="c.id"
        class="flex items-start gap-3"
        :class="c.is_me ? 'flex-row-reverse' : 'flex-row'"
      >
        <!-- User Avatar -->
        <div class="w-8 h-8 rounded-full overflow-hidden bg-orange-100 dark:bg-[#fcb4d5]/20 border border-orange-200 dark:border-[#fcb4d5]/30 flex-shrink-0 flex items-center justify-center text-xs font-bold text-orange-700 dark:text-[#fcb4d5] shadow-xs mt-1">
          <img v-if="c.user_avatar" :src="c.user_avatar" :alt="c.user_name" class="w-full h-full object-cover">
          <span v-else>{{ c.user_name ? c.user_name.charAt(0) : '?' }}</span>
        </div>

        <!-- Bubble Container -->
        <div class="flex flex-col max-w-[82%] sm:max-w-[75%]" :class="c.is_me ? 'items-end' : 'items-start'">
          
          <!-- Author Info Line -->
          <div class="flex items-center space-x-2 mb-1 px-1">
            <span class="text-[11px] font-bold" :class="c.is_me ? 'text-orange-600 dark:text-[#fcb4d5]' : 'text-slate-700 dark:text-slate-300'">
              {{ c.is_me ? 'Вы' : c.user_name }}
            </span>

            <!-- Role Badge -->
            <span
              v-if="c.user_level >= 3"
              class="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 font-mono flex items-center space-x-1"
            >
              <svg class="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <span>Руководство</span>
            </span>
            <span
              v-else-if="c.user_level === 2"
              class="text-[9px] font-black px-1.5 py-0.2 rounded bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 font-mono"
            >
              Глава цеха
            </span>
            <span
              v-else-if="c.is_author_assignee"
              class="text-[9px] font-black px-1.5 py-0.2 rounded bg-orange-50 dark:bg-[#fcb4d5]/15 text-orange-700 dark:text-[#fcb4d5] border border-orange-200 dark:border-[#fcb4d5]/30 font-mono"
            >
              Исполнитель
            </span>

            <!-- Timestamp -->
            <span class="text-[9px] text-slate-400 dark:text-slate-500 font-mono">
              {{ formatTime(c.created_at) }}
            </span>
          </div>

          <!-- Message Bubble -->
          <div
            class="px-4 py-2.5 rounded-2xl text-xs leading-relaxed break-words shadow-xs transition-all font-medium"
            :class="c.is_me
              ? 'bg-orange-500 dark:bg-[#fcb4d5] text-white dark:text-[#0f0f14] rounded-tr-none font-semibold'
              : 'bg-white dark:bg-[#14151D] border border-black/[0.06] dark:border-white/[0.08] text-slate-800 dark:text-slate-200 rounded-tl-none'"
          >
            {{ c.message }}
          </div>

        </div>
      </div>

    </div>

    <!-- Quick Phrases Toolbar -->
    <div class="px-4 py-2 bg-slate-50 dark:bg-[#111219] border-t border-black/[0.06] dark:border-white/[0.07] flex items-center space-x-1.5 overflow-x-auto text-[11px] no-scrollbar transition-colors">
      <span class="text-slate-400 font-semibold uppercase text-[9px] flex-shrink-0 tracking-wider">Быстрый ответ:</span>
      <button
        v-for="phrase in quickPhrases"
        :key="phrase"
        type="button"
        @click="sendQuickPhrase(phrase)"
        class="flex-shrink-0 px-2.5 py-1 rounded-lg bg-white dark:bg-[#181924] hover:bg-orange-50 dark:hover:bg-[#fcb4d5]/15 text-slate-700 dark:text-slate-300 hover:text-orange-600 dark:hover:text-[#fcb4d5] border border-black/[0.06] dark:border-white/[0.08] transition-all text-[11px] font-medium shadow-2xs active:scale-95"
      >
        {{ phrase }}
      </button>
    </div>

    <!-- Ergonomic Input Form -->
    <div class="p-3 md:p-4 border-t border-black/[0.06] dark:border-white/[0.07] bg-white dark:bg-[#0D0E12] transition-colors">
      <form @submit.prevent="submitMessage" class="flex items-center gap-2">
        <div class="relative flex-1">
          <input
            v-model="inputMessage"
            @keydown.enter.exact.prevent="submitMessage"
            type="text"
            placeholder="Напишите сообщение в чат задачи... (Enter для отправки)"
            class="w-full text-xs px-4 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-slate-50 dark:bg-[#14151D] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5] focus:ring-2 focus:ring-orange-500/20 dark:focus:ring-[#fcb4d5]/20 transition-all"
          />
        </div>
        
        <button
          type="submit"
          :disabled="!inputMessage.trim() || sending"
          class="btn-neon text-white dark:text-black rounded-2xl px-4 py-3 min-h-[44px] min-w-[44px] flex items-center justify-center space-x-1.5 transition-all disabled:opacity-40 flex-shrink-0 text-xs font-black shadow-sm"
          title="Отправить сообщение"
        >
          <span>{{ sending ? '...' : 'Отправить' }}</span>
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </form>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';

const props = defineProps({
  taskId: {
    type: Number,
    required: true
  }
});

const comments = ref([]);
const inputMessage = ref('');
const sending = ref(false);
const chatContainer = ref(null);
let pollInterval = null;

const quickPhrases = [
  'Принял задачу в работу',
  'Материалы готовы и загружены',
  'Уточните, пожалуйста, дедлайн',
  'Внес исправления по замечаниям',
  'Файлы доступны по внешней ссылке'
];

const scrollToBottom = async () => {
  await nextTick();
  if (chatContainer.value) {
    chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
  }
};

const formatTime = (ts) => {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}.${mm} ${hh}:${min}`;
  } catch (e) {
    return ts;
  }
};

const fetchComments = async () => {
  try {
    const res = await fetch(`/api/tasks/${props.taskId}/comments`);
    if (res.ok) {
      const data = await res.json();
      const prevLength = comments.value.length;
      comments.value = data.comments || [];
      if (comments.value.length > prevLength) {
        scrollToBottom();
      }
    }
  } catch (err) {
    console.error('Failed to fetch comments:', err);
  }
};

const submitMessage = async () => {
  const text = inputMessage.value.trim();
  if (!text || sending.value) return;

  sending.value = true;
  try {
    const res = await fetch(`/api/tasks/${props.taskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });

    if (res.ok) {
      inputMessage.value = '';
      await fetchComments();
      scrollToBottom();
    }
  } catch (err) {
    console.error('Failed to send comment:', err);
  } finally {
    sending.value = false;
  }
};

const sendQuickPhrase = (phrase) => {
  inputMessage.value = phrase;
  submitMessage();
};

onMounted(() => {
  fetchComments();
  pollInterval = setInterval(fetchComments, 4000);
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
});
</script>
