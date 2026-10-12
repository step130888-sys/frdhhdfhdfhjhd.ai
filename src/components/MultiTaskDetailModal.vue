<template>
  <transition name="modal">
    <div
      v-if="isOpen && event"
      class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md"
      @click.self="$emit('close')"
    >
      <div class="cyber-glass max-w-4xl w-full max-h-[92vh] flex flex-col rounded-3xl border border-white/60 dark:border-white/10 shadow-2xl overflow-hidden backdrop-blur-3xl">
      
      <!-- Modal Top Bar -->
      <div class="px-6 py-5 bg-white/40 dark:bg-white/[0.04] backdrop-blur-xl border-b border-black/[0.05] dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0">
        <div class="flex items-start space-x-3.5">
          <div class="w-12 h-12 rounded-2xl bg-orange-500/10 dark:bg-[#fcb4d5]/15 border border-orange-500/20 dark:border-[#fcb4d5]/30 flex items-center justify-center text-orange-600 dark:text-[#fcb4d5] flex-shrink-0 shadow-lg">
            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
            </svg>
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2 mb-1">
              <span class="text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-orange-500/10 dark:bg-[#fcb4d5]/15 text-orange-600 dark:text-[#fcb4d5] border border-orange-500/20 dark:border-[#fcb4d5]/30 font-mono">
                Мульти-задача #{{ event.id }}
              </span>
              <span
                class="text-[10px] font-bold px-2.5 py-0.5 rounded-full border font-mono inline-flex items-center gap-1.5"
                :class="event.status === 'done' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/30' : 'bg-orange-500/10 dark:bg-[#fcb4d5]/15 text-orange-600 dark:text-[#fcb4d5] border-orange-500/20 dark:border-[#fcb4d5]/30'"
              >
                <span class="w-1.5 h-1.5 rounded-full" :class="event.status === 'done' ? 'bg-emerald-500' : 'bg-orange-500 dark:bg-[#fcb4d5] animate-pulse'"></span>
                {{ event.status === 'done' ? 'Завершено' : 'В работе' }}
              </span>
            </div>
            <h3 class="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-snug">
              {{ event.title }}
            </h3>
          </div>
        </div>

        <!-- Header Actions: Edit & Close -->
        <div class="flex items-center space-x-2.5 self-start sm:self-auto">
          <button
            v-if="isLeader && event.id < 900000"
            @click="$emit('edit', event)"
            class="px-4 py-2 rounded-xl bg-orange-500/10 dark:bg-[#fcb4d5]/15 hover:bg-orange-500/20 dark:hover:bg-[#fcb4d5]/25 text-orange-600 dark:text-[#fcb4d5] border border-orange-500/20 dark:border-[#fcb4d5]/30 text-xs font-bold transition-all flex items-center space-x-1.5 shadow-xs active:scale-95 cursor-pointer"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
            </svg>
            <span>Редактировать мульти-задачу</span>
          </button>
          
          <button
            @click="$emit('close')"
            class="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center text-sm transition-colors cursor-pointer"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Modal Body (Scrollable) -->
      <div class="p-6 overflow-y-auto flex-1 space-y-6">
        
        <!-- Meta Details Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="p-3.5 rounded-2xl bg-white/40 dark:bg-white/[0.03] backdrop-blur-md border border-slate-200/80 dark:border-white/10">
            <span class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-1">Дата проведения:</span>
            <span class="text-sm font-black text-slate-900 dark:text-white font-mono flex items-center space-x-1.5">
              <svg class="w-4 h-4 text-orange-500 dark:text-[#fcb4d5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>{{ event.event_date }}</span>
            </span>
          </div>

          <div class="p-3.5 rounded-2xl bg-white/40 dark:bg-white/[0.03] backdrop-blur-md border border-slate-200/80 dark:border-white/10">
            <span class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-1">Дедлайн сдачи:</span>
            <span class="text-sm font-black text-amber-500 dark:text-amber-400 font-mono flex items-center space-x-1.5">
              <svg class="w-4 h-4 text-amber-500 dark:text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>{{ event.deadline || 'Не установлен' }}</span>
            </span>
          </div>

          <div class="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#14141c] border border-slate-200 dark:border-white/10">
            <span class="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-1">Задействовано цехов:</span>
            <span class="text-sm font-black text-orange-600 dark:text-[#fcb4d5] font-mono flex items-center space-x-1.5">
              <svg class="w-4 h-4 text-orange-500 dark:text-[#fcb4d5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span>{{ event.subtasks ? event.subtasks.length : 0 }} направлений</span>
            </span>
          </div>
        </div>

        <!-- Description / Brief -->
        <div v-if="event.description" class="p-4 rounded-2xl bg-slate-50 dark:bg-[#14141c] border border-slate-200 dark:border-white/10">
          <span class="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block mb-1.5">
            Общее техническое задание и сценарий:
          </span>
          <p class="text-xs text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
            {{ event.description }}
          </p>
        </div>

        <!-- Subtasks Section -->
        <div>
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-xs font-black uppercase tracking-wider text-orange-600 dark:text-[#fcb4d5] flex items-center space-x-2">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
              </svg>
              <span>Подзадачи по направлениям ({{ event.subtasks ? event.subtasks.length : 0 }}):</span>
            </h4>
            <span class="text-[10px] text-slate-400 hidden sm:inline">
              Нажмите на подзадачу для перехода в чат и к сдаче материалов
            </span>
          </div>

          <div v-if="!event.subtasks || event.subtasks.length === 0" class="p-8 text-center rounded-2xl bg-slate-50 dark:bg-[#14141c] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 text-xs">
            В этой мульти-задаче пока нет подзадач.
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="st in event.subtasks"
              :key="st.id"
              @click="$router.push(`/task/${st.id}`)"
              class="p-4 rounded-2xl bg-white dark:bg-[#14141c] border border-slate-200 dark:border-white/10 hover:border-orange-500 dark:hover:border-[#fcb4d5] hover:bg-orange-50/20 dark:hover:bg-[#1a1a24] transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group shadow-xs"
            >
              <!-- Left info -->
              <div class="space-y-1.5 flex-1">
                <div class="flex items-center space-x-2">
                  <span
                    class="text-[11px] font-black px-2.5 py-0.5 rounded-lg uppercase tracking-wider border font-mono inline-flex items-center gap-1.5"
                    :class="getDirBadgeClasses(st.direction)"
                  >
                    <!-- Workshop SVG Icon -->
                    <svg v-if="st.direction === 'Фото'" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                    </svg>
                    <svg v-else-if="st.direction === 'Дизайн'" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2z"/>
                    </svg>
                    <svg v-else-if="st.direction === 'Видео'" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                    </svg>
                    <svg v-else-if="st.direction === 'Моушен'" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                    </svg>
                    <svg v-else-if="st.direction === 'СММ'" class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/>
                    </svg>
                    <span v-else class="w-1.5 h-1.5 rounded-full bg-current"></span>
                    <span>{{ st.direction }}</span>
                  </span>
                  
                  <span
                    class="text-[10px] font-bold px-2 py-0.5 rounded-lg border font-mono"
                    :class="getStatusBadgeClass(st.status)"
                  >
                    {{ getStatusLabel(st.status) }}
                  </span>

                  <span class="text-xs font-mono text-slate-400">#{{ st.id }}</span>
                </div>

                <div class="font-bold text-slate-900 dark:text-white text-xs group-hover:text-orange-600 dark:group-hover:text-[#fcb4d5] transition-colors">
                  {{ st.title }}
                </div>

                <p v-if="st.description" class="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                  {{ st.description }}
                </p>
              </div>

              <!-- Right: Assignee & Action -->
              <div class="flex items-center space-x-3 sm:space-x-4 flex-shrink-0 self-start sm:self-auto" @click.stop>
                <!-- Assignee -->
                <div class="flex items-center space-x-2">
                  <template v-if="st.assigned_to">
                    <div class="w-6 h-6 rounded-full overflow-hidden bg-orange-500/20 dark:bg-[#fcb4d5]/20 text-orange-600 dark:text-[#fcb4d5] flex-shrink-0 text-[10px] flex items-center justify-center font-bold">
                      <img v-if="st.assigned_to.avatar_url" :src="st.assigned_to.avatar_url" class="w-full h-full object-cover">
                      <span v-else>{{ st.assigned_to.name.charAt(0) }}</span>
                    </div>
                    <router-link :to="`/profile/${st.assigned_to.id}`" class="text-xs text-slate-700 dark:text-slate-300 hover:text-orange-600 dark:hover:text-[#fcb4d5] font-semibold truncate max-w-[120px]">
                      {{ st.assigned_to.name }}
                    </router-link>
                  </template>
                  <template v-else>
                    <span class="text-xs text-slate-400 italic">Свободна</span>
                  </template>
                </div>

                <!-- Chat & Open Link -->
                <router-link
                  :to="`/task/${st.id}`"
                  class="btn-cyan text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1.5"
                >
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <span>Чат</span>
                  <span v-if="st.comment_count">({{ st.comment_count }})</span>
                </router-link>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Modal Footer -->
      <div class="px-6 py-4 bg-slate-50 dark:bg-[#101016] border-t border-slate-200 dark:border-white/10 flex items-center justify-between flex-shrink-0">
        <span class="text-[11px] text-slate-500">
          Студенческий медиацентр «СМС СГТУ»
        </span>
        <button
          @click="$emit('close')"
          class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
        >
          Закрыть
        </button>
      </div>

    </div>
  </div>
</transition>
</template>

<script setup>
const props = defineProps({
  isOpen: Boolean,
  event: Object,
  isLeader: Boolean
});

const emit = defineEmits(['close', 'edit']);

const getDirBadgeClasses = (dir) => {
  switch (dir) {
    case 'Фото': return 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30';
    case 'Дизайн': return 'bg-pink-500/15 text-pink-600 dark:text-pink-300 border-pink-500/30';
    case 'Видео': return 'bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/30';
    case 'Моушен': return 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30';
    case 'СММ': return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30';
    default: return 'bg-orange-500/15 text-orange-600 dark:text-[#fcb4d5] border-orange-500/30 dark:border-[#fcb4d5]/30';
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'open': return 'Свободна';
    case 'in_progress': return 'В работе';
    case 'review': return 'Проверка';
    case 'done': return 'Готово';
    case 'rework': return 'Доработка';
    default: return 'Ожидание';
  }
};

const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'open': return 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10';
    case 'in_progress': return 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30';
    case 'review': return 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30';
    case 'done': return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30';
    case 'rework': return 'bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/30';
    default: return 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10';
  }
};
</script>
