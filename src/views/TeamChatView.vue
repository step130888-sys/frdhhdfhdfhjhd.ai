<template>
  <div class="max-w-7xl mx-auto px-2 sm:px-4 pb-24 sm:pb-6">
    <!-- Top Header -->
    <div class="glass-card rounded-2xl p-3.5 sm:p-5 mb-3 sm:mb-4 border border-white/10 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-emerald-500/25 via-teal-500/15 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-950/50">
          <svg class="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
          </svg>
        </div>
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <h1 class="text-base sm:text-xl font-extrabold text-white tracking-tight">Общий чат команды</h1>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              2–5 уровень
            </span>
          </div>
          <p class="text-xs text-gray-400 mt-0.5">
            Общение участников медиацентра, обмен фото и материалами (вся история сохраняется)
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-gray-300">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>В сети: <strong class="text-emerald-300">{{ onlineCount }}</strong> из {{ members.length }}</span>
        </div>
        <button
          @click="showMembersSidebar = !showMembersSidebar"
          class="lg:hidden px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-200 transition flex items-center gap-1.5"
        >
          <span>👥 Участники</span>
        </button>
      </div>
    </div>

    <!-- Main Chat Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-4 gap-4 items-stretch">
      <!-- Chat Window (3 columns on desktop) -->
      <div class="lg:col-span-3 glass-card rounded-2xl border border-white/10 flex flex-col h-[calc(100vh-230px)] min-h-[500px] max-h-[780px] overflow-hidden relative">
        <!-- Messages Feed -->
        <div
          ref="messagesContainer"
          @scroll="handleScroll"
          class="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3.5 custom-scrollbar"
        >
          <!-- Loading State -->
          <div v-if="loading" class="flex flex-col items-center justify-center h-full text-gray-400 gap-3 py-16">
            <div class="w-9 h-9 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <span class="text-xs font-medium">Загрузка истории чата команды...</span>
          </div>

          <!-- Empty State -->
          <div v-else-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-center py-16 px-4">
            <div class="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-3xl mb-3">
              💬
            </div>
            <h3 class="text-base font-bold text-white mb-1">Чат команды пока пуст</h3>
            <p class="text-xs text-gray-400 max-w-sm">
              Напишите первое сообщение или отправьте фотографию — вся переписка и снимки надежно сохраняются.
            </p>
          </div>

          <!-- Messages List -->
          <template v-else>
            <div
              v-for="msg in messages"
              :key="msg.id"
              :id="'chat-msg-' + msg.id"
              class="flex items-start gap-2.5 sm:gap-3 group transition-colors duration-300 rounded-xl p-1"
              :class="msg.is_me ? 'flex-row-reverse' : 'flex-row'"
            >
              <!-- User Avatar -->
              <router-link
                :to="`/profile/${msg.user_id}`"
                class="relative flex-shrink-0 mt-0.5"
                :title="`${msg.user_name} (${msg.user_role})`"
              >
                <img
                  v-if="msg.user_avatar"
                  :src="msg.user_avatar"
                  :alt="msg.user_name"
                  class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover border border-white/15 shadow"
                />
                <div
                  v-else
                  class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white border border-white/15 shadow"
                  :class="levelAvatarBg(msg.user_level)"
                >
                  {{ msg.user_name ? msg.user_name.charAt(0).toUpperCase() : '?' }}
                </div>
                <span
                  v-if="msg.is_online"
                  class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0b0f17]"
                ></span>
              </router-link>

              <!-- Message Bubble -->
              <div
                class="max-w-[82%] sm:max-w-[72%] rounded-2xl px-3.5 py-2.5 border shadow-md relative"
                :class="msg.is_me
                  ? 'bg-gradient-to-br from-emerald-600/30 to-teal-700/25 border-emerald-500/35 text-white rounded-tr-sm'
                  : 'bg-white/[0.05] border-white/10 text-gray-100 rounded-tl-sm'"
              >
                <!-- Sender Header -->
                <div class="flex items-center gap-2 flex-wrap mb-1" :class="msg.is_me ? 'justify-end' : 'justify-start'">
                  <router-link
                    :to="`/profile/${msg.user_id}`"
                    class="text-xs font-bold hover:underline"
                    :class="levelNameColor(msg.user_level)"
                  >
                    {{ msg.user_name }}
                  </router-link>
                  <span v-if="msg.user_role" class="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-gray-300 font-medium">
                    {{ msg.user_role }}
                  </span>
                  <span
                    class="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border"
                    :class="levelBadgeClass(msg.user_level)"
                  >
                    {{ levelShortLabel(msg.user_level) }}
                  </span>
                </div>

                <!-- Reply Quote Preview -->
                <div
                  v-if="msg.reply_preview"
                  @click="scrollToMessage(msg.reply_preview.id)"
                  class="mb-2 pl-2.5 pr-2 py-1.5 rounded-lg bg-black/30 border-l-2 border-emerald-400 cursor-pointer hover:bg-black/45 transition text-left"
                >
                  <div class="text-[10px] font-bold text-emerald-300 truncate">
                    ↩ {{ msg.reply_preview.user_name }}
                  </div>
                  <div class="text-[11px] text-gray-300 truncate">
                    {{ msg.reply_preview.message || '📷 Фотография' }}
                  </div>
                </div>

                <!-- Attached Photo -->
                <div v-if="msg.photo_url" class="mb-1.5 mt-1">
                  <img
                    :src="msg.photo_url"
                    alt="Фото в чате"
                    @click="openLightbox(msg)"
                    class="rounded-xl max-h-72 sm:max-h-80 w-auto object-cover border border-white/10 cursor-zoom-in hover:opacity-95 transition shadow-lg"
                    loading="lazy"
                  />
                </div>

                <!-- Text Content -->
                <p
                  v-if="msg.message"
                  class="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words text-left"
                >{{ msg.message }}</p>

                <!-- Timestamp & Actions Footer -->
                <div class="flex items-center justify-between gap-3 mt-1.5 pt-1 border-t border-white/5 text-[10px] text-gray-400">
                  <span>{{ formatTime(msg.created_at) }}</span>
                  <div class="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition">
                    <button
                      @click="setReply(msg)"
                      class="hover:text-emerald-300 transition font-medium"
                      title="Ответить на сообщение"
                    >
                      ↩ Ответить
                    </button>
                    <button
                      v-if="msg.is_me || isLeader"
                      @click="deleteMessage(msg.id)"
                      class="hover:text-rose-400 transition font-medium"
                      title="Удалить сообщение"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- Scroll to Bottom Floating Pill -->
        <button
          v-if="showScrollDownBtn"
          @click="scrollToBottom(true)"
          class="absolute bottom-24 right-5 z-20 px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg flex items-center gap-1.5 border border-emerald-400/40 transition"
        >
          <span>↓ Вниз</span>
        </button>

        <!-- Reply / Photo Preview Bar -->
        <div
          v-if="replyTo || photoPreviewUrl"
          class="px-3.5 py-2 bg-black/50 border-t border-white/10 flex items-center justify-between gap-3 flex-wrap"
        >
          <!-- Reply indicator -->
          <div v-if="replyTo" class="flex items-center gap-2 min-w-0 flex-1">
            <div class="w-1 h-8 rounded-full bg-emerald-400 flex-shrink-0"></div>
            <div class="min-w-0 flex-1">
              <div class="text-[11px] font-bold text-emerald-300 truncate">
                Ответ для {{ replyTo.user_name }}
              </div>
              <div class="text-xs text-gray-300 truncate">
                {{ replyTo.message || '📷 Фотография' }}
              </div>
            </div>
            <button
              @click="replyTo = null"
              class="p-1 text-gray-400 hover:text-white rounded-lg"
              title="Отменить ответ"
            >
              ✕
            </button>
          </div>

          <!-- Selected Photo Preview -->
          <div v-if="photoPreviewUrl" class="flex items-center gap-2.5 bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/10">
            <img :src="photoPreviewUrl" alt="Preview" class="w-10 h-10 rounded-lg object-cover border border-emerald-500/40" />
            <div class="text-xs">
              <div class="font-semibold text-emerald-300 truncate max-w-[160px]">{{ photoFile?.name || 'Фотография' }}</div>
              <div class="text-[10px] text-gray-400">{{ formatFileSize(photoFile?.size) }}</div>
            </div>
            <button
              @click="clearSelectedPhoto"
              class="p-1 text-rose-400 hover:text-rose-300 font-bold text-xs"
              title="Убрать фото"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Composer Input Bar -->
        <form
          @submit.prevent="sendMessage"
          @paste="handlePaste"
          class="p-2.5 sm:p-3.5 bg-black/40 border-t border-white/10 flex items-end gap-2"
        >
          <!-- Hidden File Input -->
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleFileSelect"
          />

          <!-- Attach Photo Button -->
          <button
            type="button"
            @click="$refs.fileInput.click()"
            class="p-2.5 sm:p-3 rounded-xl bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/40 text-gray-300 hover:text-emerald-300 transition flex-shrink-0"
            title="Прикрепить фотографию (или вставьте через Ctrl+V)"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>

          <!-- Textarea -->
          <textarea
            v-model="newMessage"
            @keydown.enter.exact.prevent="sendMessage"
            rows="1"
            placeholder="Напишите сообщение команде или вставьте фото (Ctrl+V)..."
            class="flex-1 bg-white/5 border border-white/10 focus:border-emerald-500/50 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none resize-none max-h-32 custom-scrollbar"
          ></textarea>

          <!-- Send Button -->
          <button
            type="submit"
            :disabled="sending || (!newMessage.trim() && !photoFile)"
            class="px-4 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:pointer-events-none transition shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 flex-shrink-0"
          >
            <span v-if="sending" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <template v-else>
              <span class="hidden sm:inline">Отправить</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </template>
          </button>
        </form>
      </div>

      <!-- Members Sidebar (Desktop + Mobile Toggle) -->
      <div
        class="glass-card rounded-2xl border border-white/10 p-4 flex-col h-[calc(100vh-230px)] min-h-[500px] max-h-[780px]"
        :class="showMembersSidebar ? 'flex' : 'hidden lg:flex'"
      >
        <div class="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
          <h2 class="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>👥 Команда чата</span>
            <span class="px-2 py-0.5 rounded-full text-[10px] bg-white/10 text-gray-300">{{ members.length }}</span>
          </h2>
          <button
            @click="showMembersSidebar = false"
            class="lg:hidden text-xs text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div class="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          <router-link
            v-for="m in members"
            :key="m.id"
            :to="`/profile/${m.id}`"
            class="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/5 transition border border-transparent hover:border-white/10"
          >
            <div class="relative flex-shrink-0">
              <img
                v-if="m.avatar_url"
                :src="m.avatar_url"
                :alt="m.name"
                class="w-8 h-8 rounded-xl object-cover border border-white/15"
              />
              <div
                v-else
                class="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-white"
                :class="levelAvatarBg(m.access_level)"
              >
                {{ m.name ? m.name.charAt(0).toUpperCase() : '?' }}
              </div>
              <span
                class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#0b0f17]"
                :class="m.is_online ? 'bg-emerald-400' : 'bg-gray-600'"
              ></span>
            </div>

            <div class="min-w-0 flex-1">
              <div class="text-xs font-bold text-white truncate flex items-center gap-1">
                <span class="truncate">{{ m.name }}</span>
                <span v-if="m.username === 'admin'" class="text-[10px]" title="Root Хранитель">👑</span>
              </div>
              <div class="flex items-center gap-1.5 text-[10px] text-gray-400">
                <span class="truncate">{{ m.role }}</span>
                <span>•</span>
                <span :class="levelNameColor(m.access_level)">{{ m.access_level }} ур.</span>
              </div>
            </div>
          </router-link>
        </div>
      </div>
    </div>

    <!-- Fullscreen Photo Lightbox -->
    <div
      v-if="lightboxMsg"
      @click.self="lightboxMsg = null"
      class="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
    >
      <div class="flex items-center justify-between w-full max-w-4xl mb-3 text-white">
        <div class="flex items-center gap-2">
          <span class="font-bold text-sm">{{ lightboxMsg.user_name }}</span>
          <span class="text-xs text-gray-400">{{ formatTime(lightboxMsg.created_at) }}</span>
        </div>
        <div class="flex items-center gap-2">
          <a
            :href="lightboxMsg.photo_url"
            download
            target="_blank"
            class="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition"
          >
            ⬇ Открыть / Скачать
          </a>
          <button
            @click="lightboxMsg = null"
            class="w-8 h-8 rounded-xl bg-white/10 hover:bg-rose-500/30 text-white flex items-center justify-center font-bold"
          >
            ✕
          </button>
        </div>
      </div>
      <img
        :src="lightboxMsg.photo_url"
        alt="Full size"
        class="max-h-[80vh] max-w-full rounded-2xl object-contain border border-white/15 shadow-2xl"
      />
      <p v-if="lightboxMsg.message" class="mt-3 text-xs sm:text-sm text-gray-200 max-w-2xl text-center">
        {{ lightboxMsg.message }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();
const { isLeader, showNotification } = authStore;

const messages = ref([]);
const members = ref([]);
const onlineCount = ref(0);
const loading = ref(true);
const sending = ref(false);
const newMessage = ref('');
const replyTo = ref(null);
const photoFile = ref(null);
const photoPreviewUrl = ref(null);
const lightboxMsg = ref(null);
const showMembersSidebar = ref(false);
const showScrollDownBtn = ref(false);

const messagesContainer = ref(null);
const fileInput = ref(null);
let pollTimer = null;

const levelShortLabel = (lvl) => {
  if (lvl >= 5) return '5 ур • Хранитель';
  if (lvl === 4) return '4 ур • Админ';
  if (lvl === 3) return '3 ур • Руководство';
  if (lvl === 2) return '2 ур • Команда';
  return '1 ур • Стажёр';
};

const levelBadgeClass = (lvl) => {
  if (lvl >= 5) return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  if (lvl === 4) return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
  if (lvl === 3) return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
  return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
};

const levelNameColor = (lvl) => {
  if (lvl >= 5) return 'text-amber-300';
  if (lvl === 4) return 'text-rose-300';
  if (lvl === 3) return 'text-purple-300';
  return 'text-emerald-300';
};

const levelAvatarBg = (lvl) => {
  if (lvl >= 5) return 'bg-gradient-to-br from-amber-500 to-yellow-600';
  if (lvl === 4) return 'bg-gradient-to-br from-rose-500 to-red-700';
  if (lvl === 3) return 'bg-gradient-to-br from-purple-500 to-indigo-700';
  return 'bg-gradient-to-br from-emerald-500 to-teal-700';
};

const formatTime = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Сегодня, ${timeStr}`;
    const dateStr = d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    return `${dateStr} в ${timeStr}`;
  } catch (e) {
    return iso;
  }
};

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isNearBottom = () => {
  const el = messagesContainer.value;
  if (!el) return true;
  return el.scrollHeight - el.scrollTop - el.clientHeight < 140;
};

const handleScroll = () => {
  showScrollDownBtn.value = !isNearBottom();
};

const scrollToBottom = async (smooth = false) => {
  await nextTick();
  const el = messagesContainer.value;
  if (!el) return;
  el.scrollTo({
    top: el.scrollHeight,
    behavior: smooth ? 'smooth' : 'auto'
  });
  showScrollDownBtn.value = false;
};

const scrollToMessage = (id) => {
  const target = document.getElementById('chat-msg-' + id);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('bg-emerald-500/20');
    setTimeout(() => target.classList.remove('bg-emerald-500/20'), 1500);
  }
};

const fetchInitialChat = async () => {
  loading.value = true;
  try {
    const res = await fetch('/api/team-chat?limit=250');
    const data = await res.json();
    if (res.ok && data.success) {
      messages.value = data.messages || [];
      members.value = data.members || [];
      onlineCount.value = data.online_count || 0;
      await scrollToBottom(false);
    } else if (data.error) {
      showNotification(data.error, 'error');
    }
  } catch (e) {
    console.error('Failed to load team chat:', e);
  } finally {
    loading.value = false;
  }
};

const pollNewMessages = async () => {
  try {
    const lastId = messages.value.length > 0 ? messages.value[messages.value.length - 1].id : 0;
    const wasBottom = isNearBottom();
    const res = await fetch(`/api/team-chat?after_id=${lastId}`);
    const data = await res.json();
    if (res.ok && data.success) {
      if (data.members) members.value = data.members;
      if (data.online_count !== undefined) onlineCount.value = data.online_count;
      if (Array.isArray(data.messages) && data.messages.length > 0) {
        const existingIds = new Set(messages.value.map(m => m.id));
        const incoming = data.messages.filter(m => !existingIds.has(m.id));
        if (incoming.length > 0) {
          messages.value.push(...incoming);
          if (wasBottom) {
            await scrollToBottom(true);
          }
        }
      }
    }
  } catch (e) {}
};

const handleFileSelect = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  setPhotoFile(file);
};

const handlePaste = (e) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) {
        e.preventDefault();
        setPhotoFile(file);
        break;
      }
    }
  }
};

const setPhotoFile = (file) => {
  if (photoPreviewUrl.value) {
    URL.revokeObjectURL(photoPreviewUrl.value);
  }
  photoFile.value = file;
  photoPreviewUrl.value = URL.createObjectURL(file);
};

const clearSelectedPhoto = () => {
  if (photoPreviewUrl.value) {
    URL.revokeObjectURL(photoPreviewUrl.value);
  }
  photoFile.value = null;
  photoPreviewUrl.value = null;
  if (fileInput.value) {
    fileInput.value.value = '';
  }
};

const setReply = (msg) => {
  replyTo.value = msg;
};

const openLightbox = (msg) => {
  lightboxMsg.value = msg;
};

const sendMessage = async () => {
  if (sending.value) return;
  const text = newMessage.value.trim();
  if (!text && !photoFile.value) return;

  sending.value = true;
  try {
    const formData = new FormData();
    if (text) formData.append('message', text);
    if (replyTo.value) formData.append('reply_to_id', replyTo.value.id);
    if (photoFile.value) formData.append('photo', photoFile.value);

    const res = await fetch('/api/team-chat', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Ошибка отправки сообщения');
    }

    if (data.message) {
      const exists = messages.value.some(m => m.id === data.message.id);
      if (!exists) {
        messages.value.push(data.message);
      }
    }

    newMessage.value = '';
    replyTo.value = null;
    clearSelectedPhoto();
    await scrollToBottom(true);
  } catch (err) {
    showNotification(err.message, 'error');
  } finally {
    sending.value = false;
  }
};

const deleteMessage = async (msgId) => {
  try {
    const res = await fetch(`/api/team-chat/${msgId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Не удалось удалить сообщение');
    }
    messages.value = messages.value.filter(m => m.id !== msgId);
    showNotification('Сообщение удалено', 'info');
  } catch (err) {
    showNotification(err.message, 'error');
  }
};

onMounted(() => {
  fetchInitialChat();
  pollTimer = setInterval(pollNewMessages, 2500);
});

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
  if (photoPreviewUrl.value) URL.revokeObjectURL(photoPreviewUrl.value);
});
</script>
