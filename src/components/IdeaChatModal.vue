<template>
  <transition name="modal">
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" @click.self="close">
      <div
        class="cyber-glass bg-white dark:bg-[#0E0F17] rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden"
      >
      <!-- Modal Header -->
      <div class="px-5 py-4 border-b border-black/[0.06] dark:border-white/[0.08] bg-slate-50/80 dark:bg-white/[0.02] flex items-center justify-between gap-3 flex-shrink-0">
        <div class="flex items-center space-x-3 min-w-0">
          <div class="w-10 h-10 rounded-2xl bg-amber-500/15 dark:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-300 flex-shrink-0 shadow-xs">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2v1"/><path d="M12 21v1"/><path d="M4.93 4.93l.7.7"/><path d="M18.36 18.36l.7.7"/><path d="M2 12h1"/><path d="M21 12h1"/><path d="M4.93 19.07l.7-.7"/><path d="M18.36 5.64l.7-.7"/>
              <circle cx="12" cy="12" r="5"/>
            </svg>
          </div>
          <div class="truncate">
            <div class="flex items-center space-x-2">
              <h3 class="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                {{ idea?.title || 'Обсуждение идеи' }}
              </h3>
              <!-- Status Badge -->
              <span
                class="text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase font-mono shrink-0"
                :class="getStatusBadgeClass(idea?.status)"
              >
                {{ getStatusLabel(idea?.status) }}
              </span>
            </div>
            <p class="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
              Автор: <strong class="text-slate-700 dark:text-slate-300">{{ idea?.author_name }}</strong> ({{ idea?.author_role }}) • Чат с руководством (3–5 ур.)
            </p>
          </div>
        </div>

        <div class="flex items-center space-x-2 shrink-0">
          <!-- Status Changer for Leadership (Level 3-5) -->
          <div v-if="isManagement" class="relative">
            <select
              :value="idea?.status"
              @change="updateStatus($event.target.value)"
              class="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151622] text-slate-800 dark:text-slate-200 font-bold focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5] cursor-pointer"
            >
              <option value="new">⚪ Новая</option>
              <option value="in_review">🟡 На рассмотрении</option>
              <option value="approved">🟢 Одобрено</option>
              <option value="implemented">🟣 Реализовано</option>
              <option value="rejected">🔴 Отклонено</option>
            </select>
          </div>

          <!-- Delete Proposal (Level 4-5 only) -->
          <button
            v-if="canDeleteIdea"
            @click="handleDeleteIdea"
            :disabled="isDeleting"
            title="Удалить предложение (Уровни 4–5)"
            class="p-2 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 transition-all cursor-pointer disabled:opacity-40"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/>
            </svg>
          </button>

          <button
            @click="close"
            class="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Initial Description Card -->
      <div v-if="idea?.description" class="px-5 py-3 bg-amber-500/[0.04] dark:bg-amber-500/[0.06] border-b border-black/[0.04] dark:border-white/[0.06] text-xs text-slate-700 dark:text-slate-300 leading-relaxed flex items-start space-x-2.5">
        <span class="text-amber-500 font-bold shrink-0">📌 Суть:</span>
        <div class="flex-1 whitespace-pre-line">{{ idea.description }}</div>
      </div>

      <!-- Message History (Scrollable Area) -->
      <div ref="chatContainer" class="flex-1 overflow-y-auto p-4 md:p-5 space-y-3.5 bg-slate-50/50 dark:bg-[#07080D]">
        <div v-if="loading" class="py-12 text-center text-xs text-slate-400">
          Загрузка обсуждения...
        </div>

        <div v-else-if="comments.length === 0" class="py-12 text-center text-slate-400 text-xs">
          Сообщений пока нет. Напишите первое сообщение руководству!
        </div>

        <div
          v-for="c in comments"
          :key="c.id"
          class="flex items-start gap-3"
          :class="c.is_me ? 'flex-row-reverse' : 'flex-row'"
        >
          <!-- User Avatar -->
          <div
            class="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
            :class="c.user_level >= 5
              ? 'bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-[#fcb4d5] border border-pink-300 dark:border-[#fcb4d5]/40'
              : (c.user_level >= 3
                ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40'
                : 'bg-orange-100 dark:bg-[#fcb4d5]/20 text-orange-700 dark:text-[#fcb4d5] border border-black/10 dark:border-white/10')"
          >
            <img v-if="c.user_avatar" :src="c.user_avatar" :alt="c.user_name" class="w-full h-full object-cover">
            <span v-else>{{ c.user_name ? c.user_name.charAt(0) : '?' }}</span>
          </div>

          <!-- Bubble Container -->
          <div class="flex flex-col max-w-[85%] sm:max-w-[75%]" :class="c.is_me ? 'items-end' : 'items-start'">
            <!-- Author Header -->
            <div class="flex items-center space-x-2 mb-1 px-1">
              <span class="text-[11px] font-bold" :class="c.is_me ? 'text-orange-600 dark:text-[#fcb4d5]' : 'text-slate-800 dark:text-slate-200'">
                {{ c.is_me ? 'Вы' : c.user_name }}
              </span>

              <!-- Badge -->
              <span
                v-if="c.user_level >= 5"
                class="text-[9px] font-black px-1.5 py-0.2 rounded bg-pink-100 dark:bg-pink-500/25 text-pink-700 dark:text-[#fcb4d5] border border-pink-300 dark:border-[#fcb4d5]/40 font-mono shadow-xs"
              >
                👑 Хранитель
              </span>
              <span
                v-else-if="c.user_level >= 3"
                class="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30 font-mono"
              >
                ⚡ Руководство
              </span>
              <span
                v-else-if="c.is_author"
                class="text-[9px] font-black px-1.5 py-0.2 rounded bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/15 font-mono"
              >
                💡 Автор
              </span>

              <span class="text-[9px] text-slate-400 font-mono">
                {{ formatTime(c.created_at) }}
              </span>
            </div>

            <!-- Bubble -->
            <div
              class="px-4 py-2.5 rounded-2xl text-xs leading-relaxed break-words shadow-2xs font-medium"
              :class="c.is_me
                ? 'bg-orange-500 dark:bg-[#fcb4d5] text-white dark:text-[#0f0f14] rounded-tr-none font-semibold'
                : 'bg-white dark:bg-[#141520] border border-black/[0.06] dark:border-white/[0.08] text-slate-800 dark:text-slate-200 rounded-tl-none'"
            >
              {{ c.message }}
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Input Toolbar -->
      <div class="p-3.5 border-t border-black/[0.06] dark:border-white/[0.08] bg-white/70 dark:bg-[#0D0E15] flex items-center gap-2">
        <input
          v-model="inputMessage"
          type="text"
          placeholder="Напишите ответ или уточнение по идее..."
          @keydown.enter.prevent="sendMessage"
          class="flex-1 text-xs px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#141520] text-slate-900 dark:text-white focus:outline-none focus:border-orange-500 dark:focus:border-[#fcb4d5]"
        />
        <button
          @click="sendMessage"
          :disabled="!inputMessage.trim() || sending"
          class="btn-neon px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs flex items-center space-x-1.5 disabled:opacity-40 cursor-pointer active:scale-95"
        >
          <svg class="w-3.5 h-3.5 rotate-45" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
          <span>{{ sending ? 'Отправка...' : 'Ответить' }}</span>
        </button>
      </div>
    </div>
  </div>
</transition>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '../stores/auth';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  ideaId: { type: Number, default: null }
});

const emit = defineEmits(['close', 'status-updated', 'deleted']);

const { user, isLeader, isSuperAdmin, isGuardian, showNotification } = useAuthStore();

const isManagement = computed(() => {
  return (user.value && user.value.access_level >= 3) || isLeader.value || isSuperAdmin.value || isGuardian.value;
});

const canDeleteIdea = computed(() => {
  return user.value && user.value.access_level >= 4;
});

const idea = ref(null);
const comments = ref([]);
const loading = ref(false);
const sending = ref(false);
const isDeleting = ref(false);
const inputMessage = ref('');
const chatContainer = ref(null);
let pollTimer = null;

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

const getStatusLabel = (status) => {
  const map = {
    new: 'Новая',
    in_review: 'На рассмотрении',
    approved: 'Одобрено',
    implemented: 'Реализовано',
    rejected: 'Отклонено'
  };
  return map[status] || 'Новая';
};

const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'approved':
      return 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40';
    case 'in_review':
      return 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/40';
    case 'implemented':
      return 'bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-500/40';
    case 'rejected':
      return 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/40';
    default:
      return 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-white/20';
  }
};

const fetchIdeaDetails = async () => {
  if (!props.ideaId || !props.isOpen || document.hidden) return;
  try {
    const res = await fetch(`/api/ideas/${props.ideaId}`);
    if (res.ok) {
      const data = await res.json();
      idea.value = data.idea;
      const prevCount = comments.value.length;
      comments.value = data.comments || [];
      if (comments.value.length > prevCount) {
        scrollToBottom();
      }
    }
  } catch (e) {
    console.error('Failed to load idea details:', e);
  } finally {
    loading.value = false;
  }
};

const sendMessage = async () => {
  const text = inputMessage.value.trim();
  if (!text || sending.value || !props.ideaId) return;

  sending.value = true;
  try {
    const res = await fetch(`/api/ideas/${props.ideaId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });
    const data = await res.json();
    if (res.ok) {
      inputMessage.value = '';
      await fetchIdeaDetails();
      scrollToBottom();
    } else {
      alert(data.error || 'Ошибка отправки ответа');
    }
  } catch (e) {
    alert('Сетевая ошибка при отправке ответа');
  } finally {
    sending.value = false;
  }
};

const updateStatus = async (newStatus) => {
  if (!props.ideaId || !newStatus) return;
  try {
    const res = await fetch(`/api/ideas/${props.ideaId}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (res.ok) {
      showNotification(data.message || 'Статус идеи обновлен');
      if (idea.value) idea.value.status = newStatus;
      emit('status-updated', { ideaId: props.ideaId, status: newStatus });
    } else {
      alert(data.error || 'Ошибка обновления статуса');
    }
  } catch (e) {
    alert('Сетевая ошибка при смене статуса');
  }
};

const handleDeleteIdea = async () => {
  if (!props.ideaId) return;
  if (!confirm('Вы уверены, что хотите безвозвратно удалить это предложение и весь чат обсуждения?')) return;
  isDeleting.value = true;
  try {
    const res = await fetch(`/api/ideas/${props.ideaId}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
      showNotification(data.message || 'Предложение успешно удалено');
      emit('deleted', props.ideaId);
      close();
    } else {
      alert(data.error || 'Ошибка удаления предложения');
    }
  } catch (e) {
    alert('Сетевая ошибка при удалении предложения');
  } finally {
    isDeleting.value = false;
  }
};

const close = () => {
  emit('close');
};

const handleVisibilityChange = () => {
  if (!document.hidden && props.isOpen && props.ideaId) {
    fetchIdeaDetails();
  }
};

watch(() => props.isOpen, (newVal) => {
  if (newVal && props.ideaId) {
    loading.value = true;
    fetchIdeaDetails();
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(fetchIdeaDetails, 4000);
  } else {
    if (pollTimer) clearInterval(pollTimer);
  }
});

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibilityChange);
});

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
});
</script>
