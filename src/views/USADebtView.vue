<template>
  <div class="usa-debt-page max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-8 animate-in fade-in duration-300">
    
    <!-- Top Secret Classified Header -->
    <div class="relative overflow-hidden rounded-3xl p-6 md:p-8 bg-gradient-to-br from-slate-900 via-[#100612] to-slate-950 text-white border border-pink-500/30 shadow-2xl">
      <!-- Glow ambient orbs -->
      <div class="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-pink-600/20 blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-red-600/15 blur-3xl pointer-events-none"></div>
      
      <div class="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <!-- Classified Badge -->
          <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-300 text-[10px] sm:text-xs font-black uppercase tracking-widest mb-3">
            <span class="w-2 h-2 rounded-full bg-pink-500 animate-ping"></span>
            <span>TOP SECRET // 5 УРОВЕНЬ // АРХИВ ХРАНИТЕЛЕЙ</span>
          </div>

          <div class="flex items-center space-x-3 mb-2">
            <span class="text-3xl md:text-4xl">🇺🇸</span>
            <h1 class="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center space-x-2">
              <span>Гос-Долг USA & Секретный архив</span>
            </h1>
          </div>
          <p class="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Закрытый терминал Хранителей (5 уровень). Здесь в реальном времени отслеживается финансовый пульс США, а также ведется защищенный реестр заметок, паролей и стратегических директив медиацентра.
          </p>
        </div>

        <!-- Live USA Debt Counter Box -->
        <div class="bg-black/60 backdrop-blur-xl border border-pink-500/40 rounded-2xl p-4 sm:p-5 text-right min-w-[280px] sm:min-w-[340px] shadow-inner">
          <div class="text-[10px] font-mono font-bold text-pink-400 uppercase tracking-widest flex items-center justify-end space-x-1.5 mb-1">
            <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <span>U.S. NATIONAL DEBT LIVE TICKER</span>
          </div>
          <div class="font-mono text-2xl sm:text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-rose-300 to-amber-200 tracking-tight">
            ${{ formattedDebt }}
          </div>
          <div class="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-white/10 text-left text-[11px] font-mono">
            <div>
              <span class="text-slate-400 block text-[9px] uppercase">На гражданина:</span>
              <span class="font-bold text-slate-200">${{ formattedDebtPerCitizen }}</span>
            </div>
            <div class="text-right">
              <span class="text-slate-400 block text-[9px] uppercase">Прирост в сек:</span>
              <span class="font-bold text-emerald-400">+$102,400/сек</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Notes Management Section -->
    <div class="space-y-6">
      
      <!-- Controls Header: Search + Create Button -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div class="flex items-center space-x-3">
          <div class="w-9 h-9 rounded-2xl bg-pink-500/15 dark:bg-pink-500/25 border border-pink-500/30 flex items-center justify-center text-pink-600 dark:text-[#fcb4d5] shadow-xs">
            <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <div>
            <h2 class="text-base font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
              <span>Заметки и директивы Хранителей</span>
              <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-700 dark:text-[#fcb4d5] border border-pink-500/30">
                {{ notes.length }}
              </span>
            </h2>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Только для пользователей 5-го уровня. Никто из остальных участников команды не видит эти записи.
            </p>
          </div>
        </div>

        <div class="flex items-center space-x-3">
          <button
            @click="showCreateForm = !showCreateForm"
            class="px-4 py-2.5 rounded-2xl text-xs font-black text-white bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 shadow-md shadow-pink-500/20 flex items-center space-x-2 cursor-pointer transition-all active:scale-95"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span>{{ showCreateForm ? 'Скрыть форму' : 'Создать новую заметку' }}</span>
          </button>
        </div>
      </div>

      <!-- New Note Creator Form -->
      <transition name="expand">
        <div
          v-if="showCreateForm"
          class="cyber-glass rounded-3xl p-5 md:p-6 border border-pink-300 dark:border-pink-500/30 bg-white dark:bg-[#120713]/90 shadow-xl space-y-4"
        >
          <div class="flex items-center justify-between border-b border-black/[0.05] dark:border-white/[0.08] pb-3">
            <h3 class="text-xs font-black uppercase tracking-wider text-pink-700 dark:text-[#fcb4d5] flex items-center space-x-2">
              <span>📝 Новая запись в архиве Хранителей</span>
            </h3>
            <span class="text-[10px] text-slate-400 font-mono">Доступ: 👑 Хранитель</span>
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Заголовок / Тема заметки:</label>
              <input
                v-model="newNoteTitle"
                type="text"
                placeholder="Например: План реорганизации цеха, важные ссылки или пароли..."
                class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#070208] text-slate-900 dark:text-white focus:outline-none focus:border-pink-500 font-semibold"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Текст заметки:</label>
              <textarea
                v-model="newNoteContent"
                rows="4"
                placeholder="Введите текст заметки, контакты, инструкции или стратегические решения..."
                class="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#070208] text-slate-900 dark:text-white focus:outline-none focus:border-pink-500 leading-relaxed font-mono"
              ></textarea>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
              <label class="flex items-center space-x-2 cursor-pointer select-none text-xs font-bold text-slate-700 dark:text-slate-300">
                <input
                  v-model="newNotePinned"
                  type="checkbox"
                  class="rounded text-pink-600 focus:ring-pink-500 h-4 w-4 border-slate-300 dark:border-white/20"
                />
                <span>📌 Закрепить вверху списка</span>
              </label>

              <div class="flex items-center space-x-2">
                <button
                  type="button"
                  @click="showCreateForm = false"
                  class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  @click="createNote"
                  :disabled="savingNote || !newNoteContent.trim()"
                  class="btn-neon px-5 py-2 rounded-xl text-xs font-black text-white shadow-md disabled:opacity-40 cursor-pointer flex items-center space-x-2"
                >
                  <svg v-if="savingNote" class="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/></svg>
                  <span>{{ savingNote ? 'Сохранение...' : 'Сохранить заметку' }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </transition>

      <!-- Search Filter Bar -->
      <div class="p-3.5 rounded-2xl cyber-glass border border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="relative flex-1">
          <svg class="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Поиск по заголовку или тексту заметок..."
            class="w-full text-xs pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-[#0c050d] text-slate-900 dark:text-white focus:outline-none focus:border-pink-500"
          />
        </div>

        <div class="flex items-center space-x-2 text-xs text-slate-400 font-mono shrink-0">
          <span>Найдено: <strong>{{ filteredNotes.length }}</strong></span>
        </div>
      </div>

      <!-- Notes Grid -->
      <div v-if="loading" class="py-20 text-center text-xs text-slate-400">
        <div class="animate-spin w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full mx-auto mb-3"></div>
        Загрузка секретного архива...
      </div>

      <div v-else-if="filteredNotes.length === 0" class="cyber-glass rounded-3xl p-12 text-center text-slate-400 border border-slate-200 dark:border-white/10">
        <div class="text-4xl mb-3">🇺🇸 🔐</div>
        <div class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
          {{ searchQuery ? 'Ничего не найдено по вашему запросу' : 'В архиве пока нет заметок' }}
        </div>
        <p class="text-xs text-slate-500 max-w-md mx-auto">
          Нажмите кнопку «Создать новую заметку» выше, чтобы зафиксировать секретную директиву, важные данные или планы.
        </p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div
          v-for="note in filteredNotes"
          :key="note.id"
          class="cyber-glass-card rounded-3xl p-5 flex flex-col justify-between transition-all group relative border"
          :class="note.is_pinned
            ? 'bg-gradient-to-b from-pink-500/[0.07] to-white/80 dark:to-[#0f0410] border-pink-400/50 dark:border-[#fcb4d5]/40 shadow-lg shadow-pink-500/5'
            : 'bg-white/70 dark:bg-[#0c050d] border-slate-200 dark:border-white/10 hover:border-pink-300 dark:hover:border-pink-500/30'"
        >
          <!-- Card Header -->
          <div>
            <div class="flex items-center justify-between gap-2 mb-3">
              <span
                v-if="note.is_pinned"
                class="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-pink-100 dark:bg-pink-500/25 text-pink-700 dark:text-[#fcb4d5] border border-pink-300 dark:border-pink-500/40 uppercase font-mono flex items-center space-x-1"
              >
                <span>📌</span>
                <span>Закреплено</span>
              </span>
              <span v-else class="text-[10px] text-slate-400 font-mono">
                #{{ note.id }}
              </span>

              <span class="text-[10px] text-slate-400 font-mono">
                {{ formatDate(note.created_at) }}
              </span>
            </div>

            <!-- Author info -->
            <div class="flex items-center space-x-2 mb-3 pb-3 border-b border-black/[0.04] dark:border-white/[0.06]">
              <div class="w-6 h-6 rounded-full overflow-hidden bg-pink-200 dark:bg-pink-500/30 flex items-center justify-center font-bold text-[10px] text-pink-800 dark:text-white shrink-0">
                <img v-if="note.author_avatar" :src="note.author_avatar" class="w-full h-full object-cover">
                <span v-else>{{ note.author_name ? note.author_name.charAt(0) : '?' }}</span>
              </div>
              <div class="min-w-0 text-[11px] truncate">
                <span class="font-bold text-slate-900 dark:text-white truncate">{{ note.author_name }}</span>
                <span class="text-[10px] text-pink-600 dark:text-pink-400 font-mono ml-1.5">👑 Хранитель</span>
              </div>
            </div>

            <!-- Title & Content -->
            <h3 class="font-extrabold text-sm text-slate-900 dark:text-white mb-2 leading-snug">
              {{ note.title || 'Без названия' }}
            </h3>
            <p class="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed font-mono select-text bg-black/[0.02] dark:bg-white/[0.02] p-3 rounded-2xl border border-black/[0.03] dark:border-white/[0.04] max-h-60 overflow-y-auto">
              {{ note.content }}
            </p>
          </div>

          <!-- Card Actions Footer -->
          <div class="pt-3 mt-4 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between text-xs">
            <button
              @click="copyContent(note.content)"
              title="Скопировать текст в буфер"
              class="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              <span>Копировать</span>
            </button>

            <div class="flex items-center space-x-1">
              <!-- Pin toggle button -->
              <button
                @click="togglePin(note)"
                :title="note.is_pinned ? 'Открепить заметку' : 'Закрепить заметку'"
                class="p-1.5 rounded-lg text-slate-400 hover:text-pink-600 dark:hover:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-500/10 transition-all cursor-pointer"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.89A2 2 0 0 1 15 10.77V5a3 3 0 0 0-6 0v5.77a2 2 0 0 1-1.11 1.79l-1.78.89A2 2 0 0 0 5 15.24Z"/>
                </svg>
              </button>

              <!-- Delete button -->
              <button
                @click="deleteNote(note.id)"
                title="Удалить заметку"
                class="p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all cursor-pointer"
              >
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const { showNotification } = authStore;

const notes = ref([]);
const loading = ref(true);
const searchQuery = ref('');
const showCreateForm = ref(false);

const newNoteTitle = ref('');
const newNoteContent = ref('');
const newNotePinned = ref(false);
const savingNote = ref(false);

// Real-time dynamic US National Debt simulation
const baseDebt = 36254129482109; // Baseline US National Debt in USD
const startTime = Date.now();
const currentDebt = ref(baseDebt);
let debtTimer = null;

const updateDebtTicker = () => {
  const elapsedSec = (Date.now() - startTime) / 1000;
  // US Debt grows by approx $102,400 per second
  currentDebt.value = Math.floor(baseDebt + elapsedSec * 102400);
};

const formattedDebt = computed(() => {
  return currentDebt.value.toLocaleString('en-US');
});

const formattedDebtPerCitizen = computed(() => {
  // Population approx 336 million
  const perCitizen = Math.floor(currentDebt.value / 336000000);
  return perCitizen.toLocaleString('en-US');
});

const filteredNotes = computed(() => {
  if (!searchQuery.value.trim()) return notes.value;
  const q = searchQuery.value.trim().toLowerCase();
  return notes.value.filter(n =>
    (n.title && n.title.toLowerCase().includes(q)) ||
    (n.content && n.content.toLowerCase().includes(q)) ||
    (n.author_name && n.author_name.toLowerCase().includes(q))
  );
});

const formatDate = (ts) => {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    return d.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return ts;
  }
};

const fetchNotes = async () => {
  loading.value = true;
  try {
    const res = await fetch('/api/guardian-notes');
    if (res.ok) {
      const data = await res.json();
      notes.value = data.notes || [];
    } else if (res.status === 403) {
      showNotification('Доступ разрешен только Хранителям (5 уровень).', 'error');
    }
  } catch (e) {
    console.error('Failed to load notes:', e);
  } finally {
    loading.value = false;
  }
};

const createNote = async () => {
  if (!newNoteContent.value.trim() || savingNote.value) return;
  savingNote.value = true;
  try {
    const res = await fetch('/api/guardian-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newNoteTitle.value.trim(),
        content: newNoteContent.value.trim(),
        is_pinned: newNotePinned.value
      })
    });
    const data = await res.json();
    if (res.ok) {
      showNotification(data.message || 'Секретная заметка сохранена!');
      newNoteTitle.value = '';
      newNoteContent.value = '';
      newNotePinned.value = false;
      showCreateForm.value = false;
      await fetchNotes();
    } else {
      alert(data.error || 'Ошибка при сохранении');
    }
  } catch (e) {
    alert('Сетевая ошибка при сохранении заметки');
  } finally {
    savingNote.value = false;
  }
};

const togglePin = async (note) => {
  const newStatus = note.is_pinned ? 0 : 1;
  try {
    const res = await fetch(`/api/guardian-notes/${note.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_pinned: newStatus })
    });
    if (res.ok) {
      note.is_pinned = newStatus;
      showNotification(newStatus ? 'Заметка закреплена вверху' : 'Заметка откреплена');
      await fetchNotes();
    }
  } catch (e) {
    alert('Ошибка при изменении статуса');
  }
};

const deleteNote = async (noteId) => {
  if (!confirm('Удалить эту заметку из секретного архива Хранителей?')) return;
  try {
    const res = await fetch(`/api/guardian-notes/${noteId}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
      showNotification(data.message || 'Заметка удалена');
      notes.value = notes.value.filter(n => n.id !== noteId);
    } else {
      alert(data.error || 'Ошибка при удалении');
    }
  } catch (e) {
    alert('Сетевая ошибка при удалении заметки');
  }
};

const copyContent = (text) => {
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    showNotification('Текст заметки скопирован в буфер обмена!');
  }).catch(() => {
    alert('Не удалось скопировать текст');
  });
};

onMounted(() => {
  fetchNotes();
  updateDebtTicker();
  debtTimer = setInterval(updateDebtTicker, 500);
});

onUnmounted(() => {
  if (debtTimer) clearInterval(debtTimer);
});
</script>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: all 0.25s ease-out;
}
.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Force 100% pure white text on all elements in this view regardless of active theme */
:deep(h1),
:deep(h2),
:deep(h3),
:deep(h4),
:deep(p),
:deep(span:not(.keep-color)),
:deep(div:not(.keep-bg)),
:deep(label) {
  color: #FFFFFF !important;
}

:deep(input),
:deep(textarea) {
  color: #FFFFFF !important;
  background-color: #120513 !important;
  border-color: rgba(252, 180, 213, 0.4) !important;
}

:deep(input::placeholder),
:deep(textarea::placeholder) {
  color: rgba(255, 255, 255, 0.5) !important;
}
</style>
