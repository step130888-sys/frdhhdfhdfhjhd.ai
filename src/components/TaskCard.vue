<template>
  <div
    @click="goToTask"
    class="cyber-glass-card rounded-2xl p-4 md:p-5 flex flex-col justify-between group cursor-pointer relative border border-black/[0.06] dark:border-white/[0.07] hover:border-orange-500/40 dark:hover:border-[#fcb4d5]/40 hover:-translate-y-0.5 shadow-xs hover:shadow-md active:scale-[0.985] transition-[transform,border-color,box-shadow] duration-180"
  >
    <div>
      <!-- Top Badges: Direction & Status -->
      <div class="flex items-center justify-between gap-2 mb-3">
        <!-- Direction Badge -->
        <span
          class="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border shadow-xs flex items-center space-x-1"
          :class="getDirectionClasses(task.direction)"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-current opacity-80"></span>
          <span>{{ task.direction }}</span>
        </span>

        <div class="flex items-center space-x-1.5">
          <!-- Multi-selection Checkbox -->
          <input
            v-if="selectable"
            type="checkbox"
            :checked="isSelected"
            @click.stop="$emit('toggle-select', task.id)"
            class="rounded text-orange-500 focus:ring-orange-500/20 cursor-pointer w-4 h-4 mr-0.5 accent-orange-500"
            title="Выбрать для группового удаления"
          />

          <!-- Status Badge -->
          <span
            class="text-[10px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider border flex items-center space-x-1.5"
            :class="getStatusClasses(task.status)"
          >
            <span class="relative flex h-1.5 w-1.5">
              <span v-if="task.status === 'in_progress' || task.status === 'review'" class="animate-pulse absolute inline-flex h-full w-full rounded-full opacity-75 bg-current"></span>
              <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-current"></span>
            </span>
            <span v-if="task.status === 'open'">Свободна</span>
            <span v-else-if="task.status === 'in_progress'">В работе</span>
            <span v-else-if="task.status === 'review'">На проверке</span>
            <span v-else-if="task.status === 'done'">Готово ({{ task.score }}/10)</span>
            <span v-else-if="task.status === 'rework'">Доработка</span>
          </span>

          <!-- Delete Quick Action Button -->
          <button
            v-if="canDelete"
            type="button"
            @click.stop="$emit('delete', task)"
            class="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/20 transition-all cursor-pointer opacity-70 hover:opacity-100 active:scale-90"
            title="Удалить задачу"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Task Title -->
      <div class="block transition-colors">
        <h3 class="font-bold text-sm md:text-base text-slate-900 dark:text-white leading-snug line-clamp-2 mb-1.5 group-hover:text-orange-600 dark:group-hover:text-[#fcb4d5] transition-colors">
          <span class="text-orange-600 dark:text-[#fcb4d5] font-mono text-xs font-semibold mr-1">#{{ task.id }}</span>
          {{ task.title }}
        </h3>
      </div>

      <!-- Description preview -->
      <p class="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed font-normal">
        {{ task.description }}
      </p>

      <!-- Rework Notice if in rework -->
      <div v-if="task.status === 'rework' && task.rework_notes" class="mb-4 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/25 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-start space-x-1.5">
        <svg class="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <span class="line-clamp-2">{{ task.rework_notes }}</span>
      </div>
    </div>

    <!-- Bottom Meta: Deadline, Assignee, Actions -->
    <div class="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs mt-1">
      
      <!-- Assignee / Free Info -->
      <div class="flex items-center space-x-2 min-w-0">
        <div v-if="task.assigned_to" class="flex items-center space-x-2 truncate">
          <router-link
            :to="`/profile/${task.assigned_to.id}`"
            @click.stop
            class="flex items-center space-x-2 truncate group/assignee"
          >
            <div class="w-6 h-6 rounded-full overflow-hidden bg-orange-100 dark:bg-rose-500/20 border border-orange-200 dark:border-rose-400/30 flex-shrink-0 flex items-center justify-center text-[10px] font-bold group-hover/assignee:border-orange-400 dark:group-hover/assignee:border-rose-400 transition-colors">
              <img v-if="task.assigned_to.avatar_url" :src="task.assigned_to.avatar_url" class="w-full h-full object-cover">
              <span v-else class="text-orange-700 dark:text-rose-300">{{ task.assigned_to.name.charAt(0) }}</span>
            </div>
            <span class="text-slate-700 dark:text-slate-300 font-medium truncate text-[11px] group-hover/assignee:text-orange-600 dark:group-hover/assignee:text-rose-300 transition-colors">{{ task.assigned_to.name }}</span>
          </router-link>
        </div>
        <div v-else class="text-slate-400 dark:text-slate-500 text-[11px] font-medium italic flex items-center space-x-1">
          <span class="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-600"></span>
          <span>Свободна</span>
        </div>
      </div>

      <!-- Deadline & Comments Count -->
      <div class="flex items-center space-x-2.5 flex-shrink-0">
        <!-- Result url indicator -->
        <span v-if="task.result_url" class="text-orange-600 dark:text-rose-400" title="Материалы прикреплены">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
          </svg>
        </span>

        <!-- Deadline badge -->
        <div
          v-if="task.deadline"
          class="flex items-center space-x-1 font-semibold text-[10px] px-2 py-0.5 rounded-lg border font-mono"
          :class="getDeadlineClasses(task)"
        >
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span>{{ formatDeadline(task.deadline) }}</span>
        </div>

        <!-- Comments count -->
        <div
          class="text-slate-400 hover:text-orange-600 dark:hover:text-rose-300 flex items-center space-x-1 text-[11px] font-medium transition-colors"
          title="Обсуждение задачи"
        >
          <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
          </svg>
          <span class="font-mono">{{ task.comment_count }}</span>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';

const props = defineProps({
  task: {
    type: Object,
    required: true
  },
  canDelete: {
    type: Boolean,
    default: false
  },
  selectable: {
    type: Boolean,
    default: false
  },
  isSelected: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['delete', 'toggle-select']);

const router = useRouter();

const goToTask = () => {
  router.push(`/task/${props.task.id}`);
};

const getDirectionClasses = (dir) => {
  switch (dir) {
    case 'Фото':
      return 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30';
    case 'Дизайн':
      return 'bg-pink-50 dark:bg-pink-500/15 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-500/30';
    case 'Видео':
      return 'bg-sky-50 dark:bg-cyan-500/15 text-sky-700 dark:text-cyan-300 border-sky-200 dark:border-cyan-500/30';
    case 'Моушен':
      return 'bg-purple-50 dark:bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30';
    case 'СММ':
      return 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30';
    default:
      return 'bg-slate-100 dark:bg-slate-700/30 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600/30';
  }
};

const getStatusClasses = (status) => {
  switch (status) {
    case 'open':
      return 'bg-orange-50 dark:bg-[#fcb4d5]/15 text-orange-700 dark:text-[#fcb4d5] border-orange-200 dark:border-[#fcb4d5]/30';
    case 'in_progress':
      return 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30';
    case 'review':
      return 'bg-purple-50 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30 animate-pulse';
    case 'done':
      return 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30';
    case 'rework':
      return 'bg-rose-50 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/30';
    default:
      return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
  }
};

const getDeadlineClasses = (task) => {
  if (task.is_expired) {
    return 'bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-500/40 animate-pulse';
  }
  if (task.is_urgent) {
    return 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/40';
  }
  return 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10';
};

const formatDeadline = (dl) => {
  if (!dl) return '';
  try {
    const d = new Date(dl);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}.${mm} ${hh}:${min}`;
  } catch (e) {
    return dl;
  }
};
</script>
